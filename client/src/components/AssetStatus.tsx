// components/AssetStatus.tsx

type AssetStatusValue =
  | "operational"
  | "streaming"
  | "live"
  | "standby"
  | "suspect"
  | "alerting"
  | "active"
  | "degraded"
  | "offline"
  | "unknown"
  | string;

type Asset = {
  id: string;
  name: string;
  kind: string;
  domain: "cyber" | "physical" | "osint" | "fusion" | string;
  status: AssetStatusValue;
};

type Props = {
  assets?: Asset[];
};

const FALLBACK_ASSETS: Asset[] = [
  {
    id: "asset-auth-gw-01",
    name: "AUTH SERVER",
    kind: "auth_gateway",
    domain: "cyber",
    status: "operational",
  },
  {
    id: "asset-edr-network",
    name: "EDR SENSOR NETWORK",
    kind: "endpoint_detection",
    domain: "cyber",
    status: "operational",
  },
  {
    id: "asset-network-gateway",
    name: "NETWORK GATEWAY",
    kind: "network_gateway",
    domain: "cyber",
    status: "operational",
  },
  {
    id: "asset-uas-monitoring",
    name: "UAS MONITORING",
    kind: "uas_sensor",
    domain: "physical",
    status: "operational",
  },
  {
    id: "asset-ais-monitoring",
    name: "AIS MONITORING",
    kind: "ais_feed",
    domain: "osint",
    status: "operational",
  },
  {
    id: "asset-fusion-core",
    name: "FUSION CORE",
    kind: "fusion_engine",
    domain: "fusion",
    status: "standby",
  },
];

export default function AssetStatus({ assets }: Props) {
  const displayAssets = assets && assets.length > 0 ? assets : FALLBACK_ASSETS;

  const liveCount = displayAssets.filter((asset) => {
    const status = normalizeStatus(asset.status);

    return (
      status === "streaming" ||
      status === "active" ||
      status === "live" ||
      status === "suspect" ||
      status === "alerting"
    );
  }).length;

  const alertCount = displayAssets.filter((asset) => {
    const status = normalizeStatus(asset.status);
    return status === "alerting" || status === "suspect";
  }).length;

  const headerText =
    alertCount > 0
      ? `${alertCount} ATTENTION`
      : liveCount > 0
        ? `${liveCount}/${displayAssets.length} LIVE`
        : `${displayAssets.length} MONITORED`;

  return (
    <div className="panel asset-panel">
      <div className="panel-header">
        <h2>ASSET STATUS</h2>
        <span>{headerText}</span>
      </div>

      <div className="asset-list">
        {displayAssets.map((asset) => {
          const normalizedStatus = normalizeStatus(asset.status);

          return (
            <div
              key={asset.id}
              className={`asset-row ${normalizedStatus} ${asset.domain}`}
            >
              <span>{asset.name}</span>

              <strong className={normalizedStatus}>
                {formatStatus(asset.status)}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function normalizeStatus(status: string) {
  const normalized = String(status || "unknown").toLowerCase();

  if (normalized === "live") return "live";
  if (normalized === "streaming") return "streaming";
  if (normalized === "standby") return "standby";
  if (normalized === "suspect") return "suspect";
  if (normalized === "active") return "active";
  if (normalized === "alerting") return "alerting";
  if (normalized === "degraded") return "degraded";
  if (normalized === "offline") return "offline";
  if (normalized === "operational") return "operational";

  return "unknown";
}

function formatStatus(status: string) {
  return String(status || "unknown")
    .replace(/_/g, " ")
    .toUpperCase();
}