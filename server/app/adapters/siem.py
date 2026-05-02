# app/adapters/siem.py
import json
from urllib import request, parse
from .base import Adapter


class SiemAdapter(Adapter):

    @property
    def name(self):
        return "siem"

    def _pull_page(self, *, cursor, since, page_size):
        api_key = self.config["credentials"]["api_key"]

        url = self.config.get("base_url")

        query = {"limit": page_size}
        if cursor:
            query["cursor"] = cursor
        if since:
            query["since"] = since

        full_url = f"{url}?{parse.urlencode(query)}"

        def call():
            req = request.Request(full_url, headers={
                "Authorization": f"ApiKey {api_key}",
                "Accept": "application/json"
            })
            with request.urlopen(req) as r:
                data = json.loads(r.read().decode())

            return data.get("events", []), data.get("next_cursor")

        return self._with_retry(call)

    def normalize_event(self, event):
        return {
            "id": str(event.get("id") or f"siem-{hash(str(event))}"),
            "timestamp": self._to_rfc3339_utc(event.get("timestamp")),
            "source": self.name,
            "domain": "cyber",
            "type": event.get("event_type", "siem_event"),
            "severity": event.get("severity", "unknown"),
            "raw": event,
            "metadata": {
                "host": event.get("host"),
                "ip": event.get("ip"),
            }
        }