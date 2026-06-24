import { useState } from "react";

// ─────────────────────────────────────────────
// 1. SYSTEM PROMPT — el "cerebro" de la app
//    Define el rol de Claude y el formato JSON exacto que espera la UI
// ─────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a senior Engagement Manager at Telos Labs, a product studio that builds AI-powered internal tools for mid-market companies and startups. Your job is to prepare a concise, opinionated engagement brief before a first client call.

Use web search to research the company. Then return ONLY a valid JSON object — no markdown, no explanation, no preamble.

Required format:
{
  "snapshot": {
    "what": "2 sentences: what they do and their market position",
    "stage": "estimated company stage and size",
    "facts": ["key fact 1", "key fact 2", "key fact 3"]
  },
  "pains": [
    { "area": "short area name", "detail": "specific operational pain", "severity": "high|medium|low" }
  ],
  "opportunities": [
    { "name": "opportunity name", "detail": "how AI creates real leverage here", "when": "quick-win|medium-term|strategic", "impact": "high|medium|low" }
  ],
  "questions": [
    "Discovery question 1?",
    "Discovery question 2?",
    "Discovery question 3?",
    "Discovery question 4?",
    "Discovery question 5?"
  ],
  "risks": ["Risk or watch-out 1", "Risk 2", "Risk 3"]
}

Rules:
- Max 3 pains, 3 opportunities, 5 questions, 3 risks
- Be specific to this company — no generic consulting language
- Base everything on what you find with web search`;

// ─────────────────────────────────────────────
// 2. DESIGN TOKENS — colores por severidad / timing
// ─────────────────────────────────────────────
const SEV = {
  high:   { bg: "#FCEBEB", color: "#791F1F", border: "#F09595", label: "Alta" },
  medium: { bg: "#FAEEDA", color: "#633806", border: "#EF9F27", label: "Media" },
  low:    { bg: "#EAF3DE", color: "#27500A", border: "#97C459", label: "Baja" },
};

const WHEN = {
  "quick-win":    { bg: "#E1F5EE", color: "#085041", label: "Quick win" },
  "medium-term":  { bg: "#EEEDFE", color: "#3C3489", label: "Mediano plazo" },
  "strategic":    { bg: "#FAEEDA", color: "#633806", label: "Estratégico" },
};

const IMPACT = {
  high:   { bg: "#E6F1FB", color: "#0C447C", label: "Impacto alto" },
  medium: { bg: "#F1EFE8", color: "#444441", label: "Impacto medio" },
  low:    { bg: "#F1EFE8", color: "#5F5E5A", label: "Impacto bajo" },
};

const INDUSTRIES = [
  "Fintech", "Salud", "Legal / LegalTech", "Retail", "Logística",
  "Educación", "Manufactura", "Real Estate", "SaaS B2B", "Hospitalidad", "Otro",
];

const ENG_TYPES = [
  "Herramienta interna / ops",
  "Automatización con AI",
  "Producto SaaS externo",
  "Workflow de AI",
  "Estrategia digital",
];

const LOADING_STEPS = [
  "Buscando información sobre la empresa...",
  "Analizando contexto de negocio...",
  "Identificando oportunidades de AI...",
  "Armando el brief...",
];

// ─────────────────────────────────────────────
// 3. HELPERS
// ─────────────────────────────────────────────
function Tag({ bg, color, children }) {
  return (
    <span style={{
      background: bg, color, fontSize: 11, fontWeight: 500,
      padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
      textTransform: "uppercase", color: "#6b7280", margin: "0 0 14px",
    }}>
      {children}
    </p>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", border: "0.5px solid #e5e7eb",
      borderRadius: 12, padding: "20px 24px", ...style,
    }}>
      {children}
    </div>
  );
}

// Convierte el brief a texto plano para copiar
function briefToText(company, brief) {
  const line = "─".repeat(48);
  return [
    `ENGAGEMENT BRIEF — ${company.toUpperCase()}`,
    line,
    "",
    "SNAPSHOT",
    brief.snapshot.what,
    `Etapa: ${brief.snapshot.stage}`,
    brief.snapshot.facts.map(f => `• ${f}`).join("\n"),
    "",
    "PUNTOS DE DOLOR",
    brief.pains.map(p => `[${p.severity.toUpperCase()}] ${p.area}: ${p.detail}`).join("\n"),
    "",
    "OPORTUNIDADES DE AI",
    brief.opportunities.map(o => `• ${o.name} (${o.when}): ${o.detail}`).join("\n"),
    "",
    "PREGUNTAS PARA EL DISCOVERY",
    brief.questions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
    "",
    "RIESGOS A VIGILAR",
    brief.risks.map(r => `⚠ ${r}`).join("\n"),
  ].join("\n");
}

// ─────────────────────────────────────────────
// 4. MAIN COMPONENT
// ─────────────────────────────────────────────
export default function EngagementBriefGenerator() {
  // Form state
  const [company, setCompany]   = useState("");
  const [industry, setIndustry] = useState("");
  const [engType, setEngType]   = useState("");
  const [notes, setNotes]       = useState("");

  // App state
  const [loading, setLoading]   = useState(false);
  const [stepIdx, setStepIdx]   = useState(0);
  const [brief, setBrief]       = useState(null);
  const [error, setError]       = useState("");
  const [copied, setCopied]     = useState(false);

  // ── 3. API CALL ──────────────────────────────
  // Aquí es donde ocurre la magia:
  // - Se llama a la API de Claude con el tool de web search activo
  // - Claude busca info de la empresa y genera el JSON
  // - Extraemos solo los bloques de texto de la respuesta
  const generate = async () => {
    if (!company.trim() || loading) return;
    setLoading(true);
    setBrief(null);
    setError("");
    setStepIdx(0);

    const timer = setInterval(() => {
      setStepIdx(i => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 2800);

    try {
      const userMessage =
        `Company: ${company}\n` +
        `Industry: ${industry || "Not specified"}\n` +
        `Engagement type: ${engType || "Not defined"}\n` +
        (notes ? `Additional context: ${notes}` : "");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          // Web search tool — Claude lo usa automáticamente cuando necesita investigar
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      const data = await response.json();

      // La respuesta puede tener bloques tipo "text", "tool_use", "tool_result"
      // Solo nos interesan los bloques de texto final
      const rawText = data.content
        .filter(block => block.type === "text")
        .map(block => block.text)
        .join("");

      // Extraemos el JSON del texto (por si Claude añade algo antes/después)
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in response");

      const parsed = JSON.parse(match[0]);
      setBrief(parsed);
    } catch (e) {
      console.error(e);
      setError("No se pudo generar el brief. Verifica el nombre de la empresa e intenta de nuevo.");
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  };

  const copyBrief = () => {
    navigator.clipboard.writeText(briefToText(company, brief));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setBrief(null);
    setError("");
    setCompany("");
    setIndustry("");
    setEngType("");
    setNotes("");
  };

  // ── RENDER ───────────────────────────────────
  return (
    <div style={{
      fontFamily: "system-ui, -apple-system, sans-serif",
      maxWidth: 860, margin: "0 auto", padding: "28px 20px",
      color: "#111",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus, select:focus { border-color: #0F4C81 !important; outline: none; }
        button:hover:not(:disabled) { opacity: .88; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#0F4C81" }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9ca3af" }}>
            Telos Labs · Engagement Tool
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: "0 0 4px" }}>
          Engagement Brief Generator
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
          Ingresa una empresa y genera un brief listo para el primer discovery call
        </p>
      </div>

      {/* ── FORM ── */}
      {!brief && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
                Empresa *
              </label>
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                onKeyDown={e => e.key === "Enter" && generate()}
                placeholder="ej. Kavak, Clip, Bitso, Kueski..."
                style={{
                  width: "100%", padding: "10px 12px", border: "0.5px solid #d1d5db",
                  borderRadius: 8, fontSize: 14, boxSizing: "border-box", transition: "border-color .15s",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
                Industria
              </label>
              <select
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px", border: "0.5px solid #d1d5db",
                  borderRadius: 8, fontSize: 14, background: "#fff", boxSizing: "border-box",
                }}
              >
                <option value="">Sin especificar</option>
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
                Tipo de engagement
              </label>
              <select
                value={engType}
                onChange={e => setEngType(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px", border: "0.5px solid #d1d5db",
                  borderRadius: 8, fontSize: 14, background: "#fff", boxSizing: "border-box",
                }}
              >
                <option value="">No definido</option>
                {ENG_TYPES.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: "#374151", display: "block", marginBottom: 6 }}>
                Contexto adicional <span style={{ color: "#9ca3af", fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="ej. 500 empleados, operaciones manuales, quieren automatizar..."
                style={{
                  width: "100%", padding: "10px 12px", border: "0.5px solid #d1d5db",
                  borderRadius: 8, fontSize: 14, boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <button
            onClick={generate}
            disabled={loading || !company.trim()}
            style={{
              background: !company.trim() ? "#e5e7eb" : "#0F4C81",
              color: !company.trim() ? "#9ca3af" : "#fff",
              border: "none", borderRadius: 8, padding: "11px 28px",
              fontSize: 14, fontWeight: 500, cursor: !company.trim() ? "not-allowed" : "pointer",
              transition: "background .15s",
            }}
          >
            Generar brief →
          </button>
        </Card>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <Card style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{
            width: 36, height: 36, border: "3px solid #e5e7eb", borderTopColor: "#0F4C81",
            borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 18px",
          }} />
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>{LOADING_STEPS[stepIdx]}</p>
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "6px 0 0" }}>Usando Claude + web search</p>
        </Card>
      )}

      {/* ── ERROR ── */}
      {error && (
        <div style={{
          background: "#FCEBEB", border: "0.5px solid #fca5a5",
          borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#791F1F", marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* ── BRIEF OUTPUT ── */}
      {brief && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Header del brief */}
          <div style={{
            background: "#0F4C81", borderRadius: 12, padding: "22px 26px",
            color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px", opacity: 0.65 }}>
                Engagement Brief
              </p>
              <h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 4px" }}>{company}</h2>
              {(industry || engType) && (
                <p style={{ fontSize: 13, margin: 0, opacity: 0.8 }}>
                  {[industry, engType].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={copyBrief}
                style={{
                  background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
                  borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer",
                }}
              >
                {copied ? "✓ Copiado" : "Copiar"}
              </button>
              <button
                onClick={reset}
                style={{
                  background: "rgba(255,255,255,0.1)", border: "none", color: "#fff",
                  borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer",
                }}
              >
                Nueva búsqueda
              </button>
            </div>
          </div>

          {/* Snapshot */}
          <Card>
            <SectionLabel>Snapshot de la empresa</SectionLabel>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#111", margin: "0 0 10px" }}>
              {brief.snapshot.what}
            </p>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>
              Etapa estimada:{" "}
              <strong style={{ color: "#374151" }}>{brief.snapshot.stage}</strong>
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {brief.snapshot.facts?.map((f, i) => (
                <span key={i} style={{
                  background: "#F1EFE8", color: "#444441",
                  fontSize: 12, padding: "4px 10px", borderRadius: 6,
                }}>
                  {f}
                </span>
              ))}
            </div>
          </Card>

          {/* Pains + Opportunities — 2 columnas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            {/* Puntos de dolor */}
            <Card>
              <SectionLabel>Puntos de dolor</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {brief.pains?.map((p, i) => (
                  <div key={i} style={{
                    borderLeft: `3px solid ${SEV[p.severity]?.border || "#e5e7eb"}`,
                    paddingLeft: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>{p.area}</span>
                      <Tag bg={SEV[p.severity]?.bg} color={SEV[p.severity]?.color}>
                        {SEV[p.severity]?.label || p.severity}
                      </Tag>
                    </div>
                    <p style={{ fontSize: 13, color: "#4b5563", margin: 0, lineHeight: 1.55 }}>
                      {p.detail}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Oportunidades de AI */}
            <div style={{
              background: "#F4FFFE", border: "0.5px solid #A3D9C8",
              borderRadius: 12, padding: "20px 24px",
            }}>
              <SectionLabel>Oportunidades de AI</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {brief.opportunities?.map((o, i) => (
                  <div key={i} style={{
                    background: "#fff", border: "0.5px solid #A3D9C8",
                    borderRadius: 8, padding: "12px 14px",
                  }}>
                    <div style={{ display: "flex", gap: 5, marginBottom: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#0F4C81" }}>{o.name}</span>
                      <Tag bg={WHEN[o.when]?.bg} color={WHEN[o.when]?.color}>
                        {WHEN[o.when]?.label || o.when}
                      </Tag>
                      <Tag bg={IMPACT[o.impact]?.bg} color={IMPACT[o.impact]?.color}>
                        {IMPACT[o.impact]?.label || o.impact}
                      </Tag>
                    </div>
                    <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.55 }}>
                      {o.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preguntas para el discovery */}
          <Card>
            <SectionLabel>Preguntas para el discovery call</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {brief.questions?.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: "50%", background: "#EEF2FF",
                    color: "#4338CA", fontSize: 12, fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 1,
                  }}>
                    {i + 1}
                  </span>
                  <p style={{ fontSize: 14, color: "#111", margin: 0, lineHeight: 1.65 }}>{q}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Riesgos */}
          <div style={{
            background: "#FFF7F5", border: "0.5px solid #FBCAB8",
            borderRadius: 12, padding: "20px 24px",
          }}>
            <SectionLabel>⚠ Riesgos a vigilar</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {brief.risks?.map((r, i) => (
                <p key={i} style={{ fontSize: 13, color: "#7C2D12", margin: 0, lineHeight: 1.6 }}>
                  • {r}
                </p>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
