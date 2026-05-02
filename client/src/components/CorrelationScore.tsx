// components/CorrelationScore.tsx
import { useMemo } from "react";
import "../styles/correlation.css";

type CorrelationHistoryPoint = {
  timestamp: string;
  confidence: number;
  level?: string;
};

type Correlation = {
  confidence?: number;
  level?: string;
  history?: CorrelationHistoryPoint[];
};

type Props = {
  correlation: Correlation | null;
};

type SvgPoint = {
  x: number;
  y: number;
};

export default function CorrelationScore({ correlation }: Props) {
  const confidence = correlation?.confidence ?? 0;
  const percentage = Math.round(confidence * 100);

  const level = getLevelFromCorrelation(correlation, percentage);

  const history = useMemo(() => buildHistory(correlation), [correlation]);
  const displaySeries = useMemo(() => buildDisplaySeries(history), [history]);
  const linePoints = useMemo(() => buildSvgLinePoints(displaySeries), [displaySeries]);
  const areaPoints = useMemo(() => buildSvgAreaPoints(displaySeries), [displaySeries]);
  const xLabels = useMemo(() => getXAxisLabels(history), [history]);

  const markerLeft = `${Math.min(Math.max(confidence, 0), 1) * 100}%`;

  return (
    <div className={`panel correlation-panel ${level.className}`}>
      <div className="panel-header">
        <h2>CORRELATION SCORE</h2>
      </div>

      <div className="correlation-content">
        <div className="score-ring">
          <div className="score-value">{percentage}%</div>
          <div className="score-level">{level.label}</div>
        </div>

        <div className="trend-box">
          <div className="trend-chart">
            <svg viewBox="0 0 260 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="riskAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.34" />
                  <stop offset="65%" stopColor="currentColor" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>

              <line className="axis-line" x1="32" y1="14" x2="32" y2="94" />
              <line className="axis-line" x1="32" y1="94" x2="248" y2="94" />

              {/* Y-axis grid: 5 score points */}
              <line className="grid-line" x1="32" y1="14" x2="248" y2="14" />
              <line className="grid-line" x1="32" y1="34" x2="248" y2="34" />
              <line className="grid-line" x1="32" y1="54" x2="248" y2="54" />
              <line className="grid-line" x1="32" y1="74" x2="248" y2="74" />
              <line className="grid-line" x1="32" y1="94" x2="248" y2="94" />

              {/* X-axis grid: 5 time points */}
              <line className="grid-line" x1="32" y1="14" x2="32" y2="94" />
              <line className="grid-line" x1="86" y1="14" x2="86" y2="94" />
              <line className="grid-line" x1="140" y1="14" x2="140" y2="94" />
              <line className="grid-line" x1="194" y1="14" x2="194" y2="94" />
              <line className="grid-line" x1="248" y1="14" x2="248" y2="94" />

              {/* Y-axis labels: 5 score points */}
              <text className="y-axis-label" x="4" y="18">100%</text>
              <text className="y-axis-label" x="4" y="38">75%</text>
              <text className="y-axis-label" x="4" y="58">50%</text>
              <text className="y-axis-label" x="4" y="78">25%</text>
              <text className="y-axis-label" x="4" y="98">0%</text>

              {/* X-axis labels: 5 time points */}
              <text className="x-axis-label" x="32" y="114">{xLabels[0]}</text>
              <text className="x-axis-label" x="86" y="114">{xLabels[1]}</text>
              <text className="x-axis-label" x="140" y="114">{xLabels[2]}</text>
              <text className="x-axis-label" x="194" y="114">{xLabels[3]}</text>
              <text className="x-axis-label" x="248" y="114">{xLabels[4]}</text>
              <text className="x-axis-label" x="248" y="114">{xLabels[5]}</text>


              <polygon points={areaPoints} fill="url(#riskAreaGradient)" />

              <polyline
                points={linePoints}
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="threshold-line">
        <div className="threshold-track">
          <span className="threshold-marker" style={{ left: markerLeft }} />
        </div>

        <div className="threshold-labels">
          <span>0% LOW</span>
          <span>30% MEDIUM</span>
          <span>70% HIGH</span>
          <span>100% CRITICAL</span>
        </div>
      </div>
    </div>
  );
}

function buildHistory(correlation: Correlation | null): CorrelationHistoryPoint[] {
  const backendHistory = correlation?.history ?? [];

  if (backendHistory.length > 0) {
    return backendHistory.filter((point) => typeof point.confidence === "number");
  }

  return [
    {
      timestamp: new Date().toISOString(),
      confidence: correlation?.confidence ?? 0,
      level: correlation?.level ?? "low",
    },
  ];
}

function getLevelFromCorrelation(correlation: Correlation | null, percentage: number) {
  const backendLevel = correlation?.level;

  if (backendLevel === "critical") {
    return { label: "CRITICAL", className: "critical" };
  }

  if (backendLevel === "high") {
    return { label: "HIGH CONFIDENCE", className: "high" };
  }

  if (backendLevel === "medium") {
    return { label: "MEDIUM", className: "medium" };
  }

  if (percentage > 10) {
    return { label: "ELEVATED LOW", className: "elevated" };
  }

  return { label: "LOW", className: "low" };
}

/**
 * Backend history is source-of-truth.
 * This only smooths sparse points for display.
 */
function buildDisplaySeries(history: CorrelationHistoryPoint[]) {
  const rawValues = history.map((point) => point.confidence);

  if (rawValues.length <= 1) {
    return [0, rawValues[0] ?? 0, rawValues[0] ?? 0];
  }

  const output: number[] = [];

  for (let i = 0; i < rawValues.length - 1; i++) {
    const start = rawValues[i];
    const end = rawValues[i + 1];

    output.push(start);

    const samples = 3;

    for (let j = 1; j <= samples; j++) {
      const t = j / (samples + 1);
      const base = start + (end - start) * t;
      const wiggle = Math.sin((i + 1) * (j + 2)) * 0.025;
      const value = clamp(base + wiggle, 0, 1);

      output.push(value);
    }
  }

  output.push(rawValues[rawValues.length - 1]);

  return output;
}

function buildSvgLinePoints(values: number[]) {
  return toSvgPoints(values)
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

function buildSvgAreaPoints(values: number[]) {
  const points = toSvgPoints(values);

  if (points.length === 0) {
    return "";
  }

  const first = points[0];
  const last = points[points.length - 1];

  return [
    `${first.x},94`,
    ...points.map((point) => `${point.x},${point.y}`),
    `${last.x},94`,
  ].join(" ");
}

function toSvgPoints(values: number[]): SvgPoint[] {
  const maxIndex = values.length - 1 || 1;

  return values.map((value, index) => {
    const x = 32 + (index / maxIndex) * 216;
    const clamped = clamp(value, 0, 1);
    const y = 94 - clamped * 80;

    return { x, y };
  });
}

function getXAxisLabels(history: CorrelationHistoryPoint[]) {
  if (history.length <= 1) {
    return ["--:--", "--:--", "--:--", "--:--", "--:--"];
  }

  const maxLabelIndex = 4;
  const maxHistoryIndex = history.length - 1;

  return Array.from({ length: 5 }, (_, index) => {
    const historyIndex = Math.round((index / maxLabelIndex) * maxHistoryIndex);
    const timestamp = history[historyIndex]?.timestamp ?? "";

    return formatTime(timestamp);
  });
}

function formatTime(value: string) {
  if (!value) return "--:--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}