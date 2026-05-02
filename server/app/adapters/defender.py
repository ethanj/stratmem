# app/adapters/defender.py
import json
from urllib import request, parse
from .base import Adapter


class DefenderAdapter(Adapter):

    @property
    def name(self):
        return "defender"

    def _pull_page(self, *, cursor, since, page_size):
        token = self.config["credentials"]["token"]

        url = "https://api.security.microsoft.com/api/alerts"

        query = {"$top": page_size}
        if cursor:
            query["$skiptoken"] = cursor
        if since:
            query["$filter"] = f"lastUpdateTime gt {since}"

        full_url = f"{url}?{parse.urlencode(query)}"

        def call():
            req = request.Request(full_url, headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json"
            })
            with request.urlopen(req) as r:
                data = json.loads(r.read().decode())

            events = data.get("value", [])
            next_link = data.get("@odata.nextLink")
            next_cursor = None

            if next_link and "$skiptoken=" in next_link:
                next_cursor = next_link.split("$skiptoken=")[1]

            return events, next_cursor

        return self._with_retry(call)

    def normalize_event(self, event):
        return {
            "id": str(event.get("id") or f"def-{hash(str(event))}"),
            "timestamp": self._to_rfc3339_utc(event.get("lastUpdateTime")),
            "source": self.name,
            "domain": "cyber",
            "type": "security_alert",
            "severity": event.get("severity", "unknown"),
            "raw": event,
            "metadata": {
                "title": event.get("title"),
                "status": event.get("status"),
            }
        }