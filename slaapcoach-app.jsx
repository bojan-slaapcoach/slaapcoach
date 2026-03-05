import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `Je bent SlaapCoach — een warme, deskundige AI-slaapcoach speciaal voor ouders van kinderen tussen de 3 en 8 jaar. Je helpt ouders hun kinderen zelfstandig te leren slapen.

Je communiceert altijd in het Nederlands. Je bent empathisch, geduldig en praktisch. Je geeft concrete, stap-voor-stap adviezen gebaseerd op bewezen slaapwetenschappen (zoals de "fading" methode, positieve bekrachtiging en slaaprituelen).

Jouw aanpak:
- Stel eerst 1-2 korte vragen om de situatie te begrijpen (leeftijd kind, het probleem, wat al geprobeerd is)
- Geef daarna een persoonlijk, concreet slaapplan
- Gebruik warme maar professionele taal
- Houd antwoorden beknopt en overzichtelijk (gebruik bullet points of stappen waar nuttig)
- Moedig ouders aan en erken dat dit uitdagend is

Veelvoorkomende problemen die je helpt oplossen:
- Kind wil niet alleen inslapen
- Kind komt 's nachts naar de ouders toe
- Kind heeft moeite met bedtijd / protest bij bedtijd
- Vroeg wakker worden
- Nachtmerries / angst in het donker

Geef altijd praktische tips die ouders direct kunnen toepassen. Houd je eerste reactie kort en stel maximaal 2 vragen.`;

const starters = [
  { emoji: "😴", label: "Niet alleen inslapen", text: "Mijn kind wil niet alleen in slaap vallen en roept me steeds terug." },
  { emoji: "🌙", label: "Naar ouders komen", text: "Mijn kind komt elke nacht naar ons bed." },
  { emoji: "😤", label: "Bedtijd protest", text: "Elke avond is er een gevecht bij het naar bed gaan." },
  { emoji: "🌅", label: "Vroeg wakker", text: "Mijn kind wordt veel te vroeg wakker, soms al om 5 uur." },
];

function StarField() {
  const stars = Array.from({ length: 55 }, (_, i) => ({
    id: i,
    size: Math.random() * 2.2 + 0.8,
    x: Math.random() * 100,
    y: Math.random() * 100,
    dur: (Math.random() * 3 + 2).toFixed(1),
    delay: -(Math.random() * 5).toFixed(1),
    opacity: Math.random() * 0.5 + 0.1,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {stars.map(s => (
        <div key={s.id} style={{
          position: "absolute", width: s.size, height: s.size,
          left: `${s.x}%`, top: `${s.y}%`,
          borderRadius: "50%", background: "white",
          opacity: s.opacity,
          animation: `twinkle ${s.dur}s ease-in-out infinite ${s.delay}s`,
        }} />
      ))}
    </div>
  );
}

function Moon() {
  return (
    <div style={{
      width: 70, height: 70, borderRadius: "50%",
      background: "radial-gradient(circle at 36% 36%, #fff9e6, #ffd97d 60%, #f4a020)",
      boxShadow: "0 0 40px 12px rgba(244,199,96,0.22), 0 0 80px 24px rgba(244,199,96,0.08)",
      animation: "moonFloat 7s ease-in-out infinite",
      position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "radial-gradient(circle at 65% 30%, rgba(255,255,255,0.18), transparent 55%)"
      }} />
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{
      display: "flex", gap: 5, padding: "14px 18px",
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "18px 18px 18px 4px", width: "fit-content"
    }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%", background: "#a78bfa",
          animation: `bounce 1.2s ease-in-out infinite`,
          animationDelay: `${i * 0.18}s`
        }} />
      ))}
    </div>
  );
}

function Bubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 14, gap: 10, alignItems: "flex-end",
      animation: "fadeUp 0.3s ease-out"
    }}>
      {!isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, boxShadow: "0 0 14px rgba(124,58,237,0.45)"
        }}>🌙</div>
      )}
      <div style={{
        maxWidth: "74%", padding: "13px 17px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? "linear-gradient(135deg, #7c3aed, #5b21b6)" : "rgba(255,255,255,0.07)",
        border: isUser ? "none" : "1px solid rgba(255,255,255,0.1)",
        color: "white", fontSize: 14, lineHeight: 1.65,
        boxShadow: isUser ? "0 4px 20px rgba(124,58,237,0.3)" : "none",
        whiteSpace: "pre-wrap", fontFamily: "'Georgia', serif",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function SlaapCoach() {
  const [screen, setScreen] = useState("home");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { if (screen === "chat") setTimeout(() => inputRef.current?.focus(), 300); }, [screen]);

  const callAPI = async (msgs) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: SYSTEM_PROMPT, messages: msgs,
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "Er ging iets mis, probeer opnieuw.";
      setMessages(prev => [...prev, { role: "assistant", content: text }]);
    } catch { setError("Verbinding mislukt. Probeer het opnieuw."); }
    setLoading(false);
  };

  const startChat = (text) => {
    const userMsg = { role: "user", content: text };
    setMessages([userMsg]); setScreen("chat"); callAPI([userMsg]);
  };

  const send = () => {
    const val = input.trim();
    if (!val || loading) return;
    setInput("");
    const userMsg = { role: "user", content: val };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); callAPI(newMsgs);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #07050f 0%, #130d2a 45%, #0d1535 100%)", fontFamily: "'Georgia', serif", color: "white", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:.08} 50%{opacity:.75} }
        @keyframes moonFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        * { box-sizing: border-box; }
        textarea { resize:none; font-family:'Georgia',serif; }
        textarea:focus, input:focus { outline:none; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:rgba(124,58,237,0.35); border-radius:2px; }
      `}</style>
      <StarField />

      {/* HOME */}
      {screen === "home" && (
        <div style={{ position: "relative", zIndex: 2, maxWidth: 460, margin: "0 auto", padding: "52px 22px 40px", animation: "fadeIn 0.6s ease-out" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <Moon />
            <h1 style={{
              fontSize: 36, fontWeight: "normal", letterSpacing: "-0.5px", margin: "20px 0 6px",
              background: "linear-gradient(135deg, #e0c3fc, #c4b5fd, #818cf8)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>SlaapCoach</h1>
            <p style={{ fontSize: 11, letterSpacing: "4px", color: "#a78bfa", textTransform: "uppercase", margin: "0 0 18px" }}>AI · slaaphulp voor ouders</p>
            <p style={{ fontSize: 15.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.65, maxWidth: 330, margin: "0 auto" }}>
              Jouw persoonlijke coach om je kind (3–8 jaar) zelfstandig te leren slapen.
            </p>
          </div>

          <p style={{ fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", color: "#7c3aed", marginBottom: 13, textAlign: "center" }}>Wat is jouw situatie?</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginBottom: 26 }}>
            {starters.map((s, i) => (
              <button key={i} onClick={() => startChat(s.text)} style={{
                background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 16, padding: "17px 14px", color: "white", cursor: "pointer",
                textAlign: "left", fontFamily: "'Georgia', serif", transition: "all 0.2s",
                animation: `fadeIn 0.5s ease-out ${0.1 + i * 0.08}s both`
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.18)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.45)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.045)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              >
                <div style={{ fontSize: 22, marginBottom: 8 }}>{s.emoji}</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.4, color: "rgba(255,255,255,0.78)" }}>{s.label}</div>
              </button>
            ))}
          </div>

          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginBottom: 11, textAlign: "center" }}>of beschrijf je eigen situatie</p>
          <div style={{ display: "flex", gap: 9 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && input.trim()) startChat(input.trim()); }}
              placeholder="Bijv: mijn kind van 6 slaapt niet..."
              style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 12, padding: "13px 15px", color: "white", fontSize: 13.5, fontFamily: "'Georgia', serif" }}
            />
            <button onClick={() => { if (input.trim()) startChat(input.trim()); }}
              style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "none", borderRadius: 12, padding: "13px 18px", color: "white", cursor: "pointer", fontSize: 17, boxShadow: "0 4px 18px rgba(124,58,237,0.4)" }}>→</button>
          </div>
        </div>
      )}

      {/* CHAT */}
      {screen === "chat" && (
        <div style={{ position: "relative", zIndex: 2, maxWidth: 500, margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(7,5,15,0.7)", backdropFilter: "blur(12px)" }}>
            <button onClick={() => { setScreen("home"); setMessages([]); setError(null); }}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 19, padding: "0 6px 0 0", lineHeight: 1 }}>←</button>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 0 14px rgba(124,58,237,0.45)" }}>🌙</div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: "bold" }}>SlaapCoach</div>
              <div style={{ fontSize: 10.5, color: "#a78bfa", letterSpacing: "1px" }}>● Online · AI slaapexpert</div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "22px 18px 14px" }}>
            {messages.map((m, i) => <Bubble key={i} msg={m} />)}
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #7c3aed, #4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 14px rgba(124,58,237,0.45)" }}>🌙</div>
                <TypingDots />
              </div>
            )}
            {error && <div style={{ color: "#f87171", fontSize: 13, textAlign: "center", padding: "6px 0" }}>{error}</div>}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: "12px 18px 22px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(7,5,15,0.7)", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", gap: 9, alignItems: "flex-end" }}>
              <textarea ref={inputRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Stel je vraag... (Enter om te sturen)" rows={1}
                style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.13)", borderRadius: 13, padding: "13px 15px", color: "white", fontSize: 14, lineHeight: 1.5, maxHeight: 110, overflowY: "auto" }}
              />
              <button onClick={send} disabled={loading || !input.trim()} style={{
                background: input.trim() && !loading ? "linear-gradient(135deg, #7c3aed, #4f46e5)" : "rgba(255,255,255,0.08)",
                border: "none", borderRadius: 13, padding: "13px 16px", color: "white",
                cursor: input.trim() && !loading ? "pointer" : "default", fontSize: 17, transition: "all 0.2s",
                boxShadow: input.trim() && !loading ? "0 4px 18px rgba(124,58,237,0.4)" : "none"
              }}>↑</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
