import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight,
  Mic,
  MicOff,
  Pause,
  Play,
  ShieldCheck,
  Volume2,
  VolumeX,
  UserRound,
  HeartPulse,
  ClipboardCheck,
  MessageCircle,
  Plus,
  RotateCcw,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Camera,
  X,
  Leaf,
  FileText,
  Clock,
  LayoutDashboard,
  Accessibility,
  Keyboard,
  Sparkles,
} from "lucide-react";
import {
  fields,
  extract,
  propose,
  SAMPLE,
  type RecordData,
  type Candidate,
  type Field,
  type FieldId,
} from "./intake";
import { browserSpeech, speak, type Recognition } from "./voice";
import "./styles.css";
type Stage = "story" | "identity" | "health" | "review";
type VoiceState =
  | "idle"
  | "requesting"
  | "listening"
  | "paused"
  | "stopped"
  | "error";
type Segment = {
  id: string;
  original: string;
  timestamp: string;
  source: "voice" | "text" | "sample";
};
const stages: { id: Stage; title: string; hint: string; icon: typeof Mic }[] = [
  {
    id: "identity",
    title: "About you",
    hint: "Identity & contact",
    icon: UserRound,
  },
  {
    id: "story",
    title: "Your visit",
    hint: "Tell us your story",
    icon: MessageCircle,
  },
  {
    id: "health",
    title: "Your health",
    hint: "History & medications",
    icon: HeartPulse,
  },
  {
    id: "review",
    title: "Review & finish",
    hint: "Confirm your information",
    icon: ClipboardCheck,
  },
];
const categories = [
  "Chiropractic / Physical Medicine",
  "Interventional Pain",
  "Personal Injury / MVA",
  "Concussion / Vestibular",
  "Regenerative Medicine",
  "Longevity / Hormone / Weight",
  "Hair Restoration",
  "Family / Functional Medicine",
  "Other / Unsure",
];
function App() {
  const [stage, setStage] = useState<Stage>("story");
  const [data, setData] = useState<RecordData>({});
  const dataRef = useRef(data);
  dataRef.current = data;
  const [segments, setSegments] = useState<Segment[]>([]);
  const [conflicts, setConflicts] = useState<Candidate[]>([]);
  const conflictsRef = useRef(conflicts);
  conflictsRef.current = conflicts;
  const [voice, setVoice] = useState<VoiceState>("idle");
  const [interim, setInterim] = useState("");
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState(
    "Your answers can come in any order. We’ll organize them for you.",
  );
  const [updated, setUpdated] = useState<FieldId[]>([]);
  const [audio, setAudio] = useState(true);
  const audioRef = useRef(audio);
  audioRef.current = audio;
  const [consent, setConsent] = useState(false);
  const consentRef = useRef(consent);
  consentRef.current = consent;
  const [consentModal, setConsentModal] = useState(false);
  const [large, setLarge] = useState(false);
  const [edit, setEdit] = useState<Field | null>(null);
  const [editValue, setEditValue] = useState("");
  const [category, setCategory] = useState("Other / Unsure");
  const [safety, setSafety] = useState<null | boolean>(null);
  const [accepted, setAccepted] = useState(false);
  const [accurate, setAccurate] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [staff, setStaff] = useState(false);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [queue, setQueue] = useState<
    { id: string; time: string; category: string; status: string }[]
  >([]);
  const recognition = useRef<Recognition | null>(null);
  const active = useRef(false);
  const lastAcknowledgment = useRef("");
  const photoRef = useRef<string | null>(null);
  photoRef.current = photo;
  const fileInput = useRef<HTMLInputElement>(null);
  const capture = (text: string, source: Segment["source"]) => {
    if (!text.trim()) return;
    setAccurate(false);
    const timestamp = new Date().toISOString();
    setSegments((s) => [
      ...s,
      { id: crypto.randomUUID(), original: text.trim(), timestamp, source },
    ]);
    const candidates = extract(text);
    const proposal = propose(dataRef.current, candidates);
    const next = { ...dataRef.current };
    for (const c of proposal.updates)
      next[c.id] = {
        value: c.value,
        source: c.source,
        confirmed: false,
        timestamp,
      };
    dataRef.current = next;
    setData(next);
    setUpdated(proposal.updates.map((c) => c.id));
    setConflicts((old) => [
      ...old.filter((c) => !proposal.conflicts.some((n) => n.id === c.id)),
      ...proposal.conflicts,
    ]);
    const labels = proposal.updates.map((c) =>
      fields.find((f) => f.id === c.id)!.label.toLowerCase(),
    );
    const ack = labels.length
      ? `I captured ${labels.slice(0, 3).join(", ")}${labels.length > 3 ? ` and ${labels.length - 3} more answers` : ""}. Please review the filled fields.`
      : "Your words are transcribed. Please add any unmapped details to the appropriate field.";
    lastAcknowledgment.current = ack;
    setNotice(
      proposal.conflicts.length
        ? `${ack} A different answer needs your confirmation.`
        : ack,
    );
    if (source !== "voice") speak(ack, audioRef.current);
  };
  const captureRef = useRef(capture);
  captureRef.current = capture;
  const stop = (paused = false) => {
    active.current = false;
    recognition.current?.stop();
    window.speechSynthesis?.cancel();
    setVoice(paused ? "paused" : "stopped");
    setInterim("");
  };
  const start = () => {
    if (!consentRef.current) {
      setConsentModal(true);
      return;
    }
    if (!browserSpeech.supported()) {
      setVoice("error");
      setNotice(
        "Live transcription is unavailable in this browser. Type your story below or try the sample.",
      );
      return;
    }
    window.speechSynthesis?.cancel();
    const r = browserSpeech.create()!;
    recognition.current?.abort();
    recognition.current = r;
    active.current = true;
    lastAcknowledgment.current = "";
    r.lang = "en-US";
    r.continuous = false;
    r.interimResults = true;
    r.onstart = () => {
      if (!active.current) {
        r.abort();
        return;
      }
      setVoice("listening");
      setNotice("Microphone is on. I’m listening — start wherever you like.");
    };
    r.onresult = (e) => {
      if (recognition.current !== r) return;
      let draft = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal)
          captureRef.current(e.results[i][0].transcript, "voice");
        else draft += e.results[i][0].transcript;
      }
      setInterim(draft);
    };
    r.onerror = (e) => {
      if (recognition.current !== r) return;
      active.current = false;
      setVoice("error");
      setInterim("");
      setNotice(
        e.error === "not-allowed"
          ? "Microphone access was declined. You can continue by typing."
          : e.error === "no-speech"
            ? "I didn’t hear an answer. Start a new voice section or type below."
            : "Voice transcription stopped. You can try again or use text.",
      );
    };
    r.onend = () => {
      if (recognition.current !== r) return;
      active.current = false;
      setVoice((v) => (v === "error" || v === "paused" ? v : "stopped"));
      setInterim("");
      if (lastAcknowledgment.current)
        speak(lastAcknowledgment.current, audioRef.current);
    };
    setVoice("requesting");
    setNotice("Starting your microphone. Your browser may ask for permission.");
    try {
      r.start();
    } catch {
      active.current = false;
      setVoice("error");
      setNotice(
        "The microphone could not start. Try again or use the text box.",
      );
    }
  };
  const reset = () => {
    active.current = false;
    recognition.current?.abort();
    recognition.current = null;
    window.speechSynthesis?.cancel();
    if (photoRef.current) URL.revokeObjectURL(photoRef.current);
    setPhoto(null);
    setData({});
    dataRef.current = {};
    setSegments([]);
    setConflicts([]);
    setUpdated([]);
    setInput("");
    setInterim("");
    setConsent(false);
    consentRef.current = false;
    setVoice("idle");
    setSafety(null);
    setAccepted(false);
    setAccurate(false);
    setSubmitted(false);
    setStage("story");
    setCategory("Other / Unsure");
    setPhotoConsent(false);
    setNotice("Ready for a new check-in. Your answers can come in any order.");
  };
  const resetRef = useRef(reset);
  resetRef.current = reset;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        resetRef.current();
        setNotice("Your session was cleared after 10 minutes of inactivity.");
      }, 600000);
    };
    refresh();
    window.addEventListener("pointerdown", refresh);
    window.addEventListener("keydown", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", refresh);
      window.removeEventListener("keydown", refresh);
      recognition.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => resetRef.current(), 60000);
    return () => clearTimeout(t);
  }, [submitted]);
  const updateField = (id: FieldId, value: string, confirmed = true) => {
    setData((d) => {
      const next = {
        ...d,
        [id]: {
          value,
          source: "Patient entered or reviewed",
          confirmed,
          timestamp: new Date().toISOString(),
        },
      };
      dataRef.current = next;
      return next;
    });
    setAccurate(false);
  };
  const missing = fields.filter((f) => f.required && !data[f.id]?.value);
  const filled = Object.values(data).filter((f) => f?.value).length;
  const confirmed = Object.values(data).filter(
    (f) => f?.value && f.confirmed,
  ).length;
  const currentFields = fields.filter((f) => f.group === stage);
  const storyFields = fields.filter((f) => f.group === "story");
  const complete = () => {
    if (
      missing.length ||
      !accepted ||
      !accurate ||
      safety === null ||
      conflicts.length
    )
      return;
    stop();
    const id = `IMW-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    setQueue((q) => [
      ...q,
      {
        id,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        category,
        status: safety ? "ATTENTION" : "READY",
      },
    ]);
    setSubmitted(true);
    speak(
      safety
        ? "Your demo intake is complete. Please notify staff now."
        : "Thank you. Your demo check-in is complete.",
      audio,
    );
  };
  const fieldCard = (f: Field, compact = false) => (
    <button
      className={`field-card ${data[f.id]?.value ? "has-value" : ""} ${updated.includes(f.id) ? "recent" : ""} ${compact ? "compact" : ""}`}
      key={f.id}
      onClick={() => {
        stop();
        setEdit(f);
        setEditValue(data[f.id]?.value || "");
      }}
    >
      <span className="field-label">
        {f.label}
        {f.required && <span className="required"> *</span>}
      </span>
      <span className={`field-value ${data[f.id]?.value ? "" : "empty"}`}>
        {data[f.id]?.value || f.placeholder}
      </span>
      <span className="field-status">
        {data[f.id]?.value ? (
          <>
            <Check size={13} />
            {data[f.id]?.confirmed ? "Reviewed" : "Captured · tap to review"}
          </>
        ) : (
          <>
            <Plus size={13} />
            Add an answer
          </>
        )}
      </span>
    </button>
  );
  return (
    <div className={`app ${large ? "large-text" : ""}`}>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setStaff(false);
          }}
        >
          <span className="brand-mark">
            <Leaf size={28} />
          </span>
          <span>
            <strong>
              IMW<span className="brand-dot">.</span>
            </strong>
            <small>
              INNOVATIVE MEDICAL
              <br />
              WELLNESS
            </small>
          </span>
        </a>
        <div className="sidebar-divider" />
        <div className="eyebrow sidebar-label">YOUR CHECK-IN</div>
        <nav>
          {stages.map((s, i) => {
            const Icon = s.icon;
            const count = fields.filter(
              (f) => f.group === s.id && data[f.id]?.value,
            ).length;
            return (
              <button
                className={`nav-item ${stage === s.id && !staff ? "selected" : ""}`}
                key={s.id}
                aria-label={s.title}
                onClick={() => {
                  setStage(s.id);
                  setStaff(false);
                }}
              >
                <span className="nav-icon">
                  <Icon size={19} />
                </span>
                <span className="nav-text">
                  <strong>{s.title}</strong>
                  <small>{s.hint}</small>
                </span>
                {count > 0 ? (
                  <span className="step-count">{count}</span>
                ) : (
                  <span className="step-num">0{i + 1}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-note">
            <span className="care-icon">
              <HeartPulse size={21} />
            </span>
            <strong>
              A little easier.
              <br />A little more human.
            </strong>
            <p>
              Take your time. We’re here
              <br />
              to help you feel better.
            </p>
          </div>
          <button
            className="help-button"
            onClick={() => {
              setNotice(
                "Please ask the front desk for help. You can pause and continue this intake with a staff member.",
              );
              stop(true);
            }}
          >
            <Headphones size={17} />
            Need a hand?
            <ArrowRight size={16} />
          </button>
          <div className="node-label">IMW · ENTRY KIOSK 01</div>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <div className="breadcrumb">
            Patient check-in <ChevronRight size={14} />
            <strong>
              {staff
                ? "Waiting room"
                : stages.find((s) => s.id === stage)?.title}
            </strong>
          </div>
          <div className="header-actions">
            <span className="demo-badge">
              <span />
              VISUAL DEMO
            </span>
            <button
              className="icon-button"
              aria-label={
                audio ? "Mute spoken feedback" : "Enable spoken feedback"
              }
              onClick={() => {
                setAudio(!audio);
                window.speechSynthesis?.cancel();
              }}
            >
              {audio ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
            <button
              className="icon-button"
              aria-label="Toggle large text"
              onClick={() => setLarge(!large)}
            >
              <Accessibility size={20} />
            </button>
            <button
              aria-label="Staff view"
              className={`staff-button ${staff ? "active" : ""}`}
              onClick={() => {
                stop();
                setStaff(!staff);
              }}
            >
              <LayoutDashboard size={16} />
              <span>Staff view</span>
            </button>
          </div>
        </header>
        {staff ? (
          <main className="staff-main">
            <div className="eyebrow">FRONT DESK · DEMO</div>
            <h1>The waiting room.</h1>
            <p className="lead">
              A simple view of arrivals and intake progress.
            </p>
            <div className="staff-card">
              <div className="staff-row staff-head">
                <span>ARRIVAL</span>
                <span>ENCOUNTER</span>
                <span>VISIT CATEGORY</span>
                <span>STATUS</span>
              </div>
              {queue.length ? (
                queue.map((q) => (
                  <div className="staff-row" key={q.id}>
                    <span>{q.time}</span>
                    <strong>{q.id}</strong>
                    <span>{q.category}</span>
                    <span
                      className={`queue-status ${q.status === "ATTENTION" ? "attention" : ""}`}
                    >
                      {q.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="queue-empty">
                  <Clock size={32} />
                  <h3>A calm start to the day.</h3>
                  <p>Completed demo check-ins will appear here.</p>
                </div>
              )}
            </div>
            <p className="footnote">
              This queue exists only in this browser tab. No staff notification
              is sent.
            </p>
          </main>
        ) : submitted ? (
          <main className="success">
            <span className={`success-icon ${safety ? "alert" : ""}`}>
              {safety ? <AlertCircle size={46} /> : <Check size={46} />}
            </span>
            <div className="eyebrow">DEMO CHECK-IN COMPLETE</div>
            <h1>
              {safety ? "Let’s get you some attention." : "You’re all set."}
            </h1>
            <p>
              {safety
                ? "Your answer may require immediate attention. Please notify our staff now."
                : "Your sample intake is ready for review. In the connected clinic experience, your care team would be notified."}
            </p>
            <div className="success-details">
              <span>
                <CheckCircle2 size={18} />
                Information reviewed
              </span>
              <span>
                <FileText size={18} />
                Demo acknowledgment recorded
              </span>
            </div>
            <button className="primary" onClick={reset}>
              Start a new check-in
              <ArrowRight size={18} />
            </button>
            <small>This kiosk clears the intake in 60 seconds.</small>
          </main>
        ) : (
          <main>
            <div className="intro">
              <div>
                <div className="eyebrow">
                  <span className="tiny-line" />
                  WELCOME TO INNOVATIVE MEDICAL WELLNESS
                </div>
                <h1>
                  {stage === "story" ? (
                    <>
                      Your story,
                      <br />
                      <em>in your words.</em>
                    </>
                  ) : stage === "identity" ? (
                    <>
                      Let’s get to
                      <br />
                      <em>know you.</em>
                    </>
                  ) : stage === "health" ? (
                    <>
                      A little about
                      <br />
                      <em>your health.</em>
                    </>
                  ) : (
                    <>
                      One last look.
                      <br />
                      <em>Then you’re ready.</em>
                    </>
                  )}
                </h1>
                <p className="lead">
                  {stage === "story"
                    ? "Tell us what brings you in. Speak or type, in whatever order feels right."
                    : stage === "identity"
                      ? "Add your details here, or tell us with your voice."
                      : stage === "health"
                        ? "Help your care team understand the bigger picture."
                        : "Review your answers and make any corrections before finishing."}
                </p>
              </div>
              <div className="progress-summary">
                <div
                  className="progress-ring"
                  style={
                    {
                      "--progress": `${(filled / fields.length) * 100}%`,
                    } as React.CSSProperties
                  }
                >
                  <span>
                    {filled}
                    <small>of {fields.length}</small>
                  </span>
                </div>
                <span>
                  Answers captured<strong>{confirmed} reviewed</strong>
                </span>
              </div>
            </div>
            {stage === "story" ? (
              <div className="story-layout">
                <section className="voice-section">
                  <div className="voice-card">
                    <div className="voice-card-top">
                      <span className="eyebrow">
                        <Mic size={15} />
                        SPEAK YOUR STORY
                      </span>
                      <span
                        className={`mic-status ${voice === "listening" ? "live" : ""}`}
                      >
                        <span />
                        {voice === "listening"
                          ? "LISTENING"
                          : voice === "requesting"
                            ? "STARTING"
                            : voice === "paused"
                              ? "PAUSED"
                              : voice === "stopped"
                                ? "STOPPED"
                                : "MICROPHONE OFF"}
                      </span>
                    </div>
                    <div
                      className={`orbital ${voice === "listening" ? "recording" : ""}`}
                    >
                      <div className="orbit orbit-a" />
                      <div className="orbit orbit-b" />
                      <div className="orbit orbit-c" />
                      <button
                        className="mic-orb"
                        aria-label={
                          voice === "listening"
                            ? "Pause microphone"
                            : "Start microphone"
                        }
                        onClick={() =>
                          voice === "listening" ? stop(true) : start()
                        }
                      >
                        {voice === "listening" ? (
                          <Pause size={32} fill="currentColor" />
                        ) : (
                          <Mic size={37} />
                        )}
                      </button>
                      <span className="orbit-spark spark-a" />
                      <span className="orbit-spark spark-b" />
                      <span className="orbit-spark spark-c" />
                    </div>
                    <h2>
                      {voice === "listening"
                        ? "We’re listening."
                        : voice === "paused"
                          ? "Take your time."
                          : "Start wherever you like."}
                    </h2>
                    <p className="voice-caption">
                      {voice === "listening" ? (
                        "Answer one question or share your whole story."
                      ) : (
                        <>
                          “What happened, or what health concern
                          <br />
                          brings you in today?”
                        </>
                      )}
                    </p>
                    <div
                      className={`waveform ${voice === "listening" ? "animated" : ""}`}
                      aria-hidden="true"
                    >
                      {Array.from({ length: 37 }, (_, i) => (
                        <span
                          key={i}
                          style={{
                            height: `${8 + Math.sin(i * 2.3) ** 2 * 24}px`,
                            animationDelay: `${i * 0.055}s`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="voice-actions">
                      {voice === "listening" ? (
                        <>
                          <button
                            className="primary"
                            onClick={() => stop(true)}
                          >
                            <Pause size={17} />
                            Pause
                          </button>
                          <button className="secondary" onClick={() => stop()}>
                            <MicOff size={17} />
                            Stop
                          </button>
                        </>
                      ) : (
                        <button className="primary" onClick={start}>
                          <Mic size={17} />
                          {voice === "paused"
                            ? "Resume speaking"
                            : voice === "stopped"
                              ? "Speak another section"
                              : "Start speaking"}
                        </button>
                      )}
                      <button
                        className="sample-button"
                        onClick={() => {
                          stop();
                          capture(SAMPLE, "sample");
                        }}
                      >
                        <Play size={15} />
                        Try a sample
                      </button>
                    </div>
                    <div className="voice-privacy">
                      <ShieldCheck size={14} />
                      <span>
                        You’re in control. Pause or switch to text anytime.
                      </span>
                    </div>
                  </div>
                  <div
                    className="acknowledgment"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="ack-icon">
                      <Sparkles size={17} />
                    </span>
                    <p>{notice}</p>
                  </div>
                  <div className="transcript-card">
                    <div className="section-title">
                      <h3>
                        <FileText size={17} />
                        Your transcript
                      </h3>
                      <span>
                        {segments.length
                          ? `${segments.length} section${segments.length > 1 ? "s" : ""}`
                          : "READY WHEN YOU ARE"}
                      </span>
                    </div>
                    <div
                      className={`transcript-body ${segments.length ? "has-transcript" : ""}`}
                    >
                      {segments.length ? (
                        segments.map((s) => (
                          <div className="transcript-segment" key={s.id}>
                            <span>
                              {s.source === "sample"
                                ? "SAMPLE"
                                : s.source === "voice"
                                  ? "VOICE"
                                  : "TYPED"}{" "}
                              ·{" "}
                              {new Date(s.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <p>{s.original}</p>
                          </div>
                        ))
                      ) : (
                        <p>
                          Your words will appear here as you speak.
                          <br />
                          You’ll be able to review everything before you finish.
                        </p>
                      )}
                      {interim && (
                        <p className="interim">
                          {interim}
                          <span className="typing-dot" />
                        </p>
                      )}
                    </div>
                    <form
                      className="type-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        stop();
                        capture(input, "text");
                        setInput("");
                      }}
                    >
                      <label htmlFor="story-input">
                        <Keyboard size={15} />
                        Prefer to type? That works, too.
                      </label>
                      <div className="type-input">
                        <textarea
                          id="story-input"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Tell us your story, or add another detail…"
                          rows={2}
                        />
                        <button
                          className="send-button"
                          aria-label="Transcribe typed response and fill fields"
                          disabled={!input.trim()}
                        >
                          <ArrowRight size={20} />
                        </button>
                      </div>
                    </form>
                  </div>
                </section>
                <aside className="captured-panel">
                  <div className="section-title">
                    <h3>Your answers, organized</h3>
                    <span className="captured-count">{filled}</span>
                  </div>
                  <p className="panel-description">
                    We’ll fill in what you share.
                    <br />
                    Tap any answer to review or change it.
                  </p>
                  <div className="captured-fields">
                    {storyFields.slice(0, 6).map((f) => fieldCard(f, true))}
                  </div>
                  {filled > 0 &&
                    fields.filter(
                      (f) => f.group !== "story" && data[f.id]?.value,
                    ).length > 0 && (
                      <div className="elsewhere">
                        <span className="eyebrow">ALSO CAPTURED</span>
                        {fields
                          .filter(
                            (f) => f.group !== "story" && data[f.id]?.value,
                          )
                          .map((f) => fieldCard(f, true))}
                      </div>
                    )}
                  <div className="order-note">
                    <span>
                      <CheckCircle2 size={19} />
                    </span>
                    <strong>There’s no wrong order.</strong>
                    <p>
                      Already told us your name or medications? Those answers go
                      straight to the right section.
                    </p>
                  </div>
                  <button
                    className="text-link"
                    onClick={() => setStage("review")}
                  >
                    View all answers
                    <ArrowRight size={15} />
                  </button>
                </aside>
              </div>
            ) : stage === "identity" || stage === "health" ? (
              <div className="form-layout">
                <section className="form-card">
                  <div className="section-title">
                    <h3>
                      {stage === "identity"
                        ? "Your details"
                        : "Health information"}
                    </h3>
                    <span>EDITABLE AT ANY TIME</span>
                  </div>
                  <div className="form-fields">
                    {currentFields.map((f) => fieldCard(f))}
                  </div>
                  {stage === "identity" && (
                    <div className="photo-section">
                      <div>
                        <h3>
                          <Camera size={18} />
                          Profile photo <span>OPTIONAL</span>
                        </h3>
                        <p>
                          For identification during your visit. No face
                          recognition.
                        </p>
                        <label className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={photoConsent}
                            onChange={(e) => {
                              setPhotoConsent(e.target.checked);
                              if (!e.target.checked && photo) {
                                URL.revokeObjectURL(photo);
                                setPhoto(null);
                              }
                            }}
                          />
                          I agree to take or upload a demo profile photo.
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          capture="user"
                          hidden
                          ref={fileInput}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 10000000) {
                              setNotice("Choose an image smaller than 10 MB.");
                              return;
                            }
                            if (photo) URL.revokeObjectURL(photo);
                            setPhoto(URL.createObjectURL(file));
                            e.target.value = "";
                          }}
                        />
                        <button
                          className="secondary"
                          disabled={!photoConsent}
                          onClick={() => fileInput.current?.click()}
                        >
                          <Camera size={16} />
                          {photo ? "Retake / replace" : "Take or choose photo"}
                        </button>
                      </div>
                      {photo && (
                        <img
                          src={photo}
                          className="profile-photo"
                          alt="Patient-selected demo profile photo"
                        />
                      )}
                    </div>
                  )}
                  {stage === "health" && (
                    <div className="safety-card">
                      <AlertCircle size={22} />
                      <div>
                        <h3>Do you need immediate attention?</h3>
                        <p>
                          For example, severe chest pain, difficulty breathing,
                          or new one-sided weakness.
                        </p>
                        <div className="choice-row">
                          <button
                            className={`secondary ${safety === false ? "chosen" : ""}`}
                            onClick={() => setSafety(false)}
                          >
                            No
                          </button>
                          <button
                            className={`secondary ${safety === true ? "chosen warning" : ""}`}
                            onClick={() => {
                              setSafety(true);
                              setNotice(
                                "Your answer may require immediate attention. Please notify our staff now.",
                              );
                            }}
                          >
                            Yes, I need help
                          </button>
                        </div>
                        {safety && (
                          <p className="safety-alert" role="alert">
                            Your answer may require immediate attention. Please
                            notify our staff now.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </section>
                <aside className="form-aside">
                  <span className="aside-icon">
                    <Mic size={26} />
                  </span>
                  <h2>
                    You can say
                    <br />
                    it, too.
                  </h2>
                  <p>
                    Speak your name, medications, or any other answer. We’ll put
                    supported answers in the right place.
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      setStage("story");
                      start();
                    }}
                  >
                    <Mic size={17} />
                    Use my voice
                  </button>
                  <div className="order-note">
                    <ShieldCheck size={20} />
                    <strong>Always yours to review.</strong>
                    <p>
                      Nothing becomes a confirmed answer until you review it.
                    </p>
                  </div>
                  <div className="acknowledgment" role="status">
                    <p>{notice}</p>
                  </div>
                </aside>
              </div>
            ) : (
              <section className="review-card">
                <div className="section-title">
                  <h3>
                    <ClipboardCheck size={18} />
                    Please review your information
                  </h3>
                  <span>{filled} ANSWERS</span>
                </div>
                {conflicts.length > 0 && (
                  <div className="review-alert">
                    <AlertCircle size={17} />
                    Resolve the different answers below before finishing.
                  </div>
                )}
                {["identity", "story", "health"].map((group) => (
                  <div className="review-section" key={group}>
                    <h3>
                      {group === "identity"
                        ? "About you"
                        : group === "story"
                          ? "Your visit"
                          : "Your health"}
                    </h3>
                    <div className="review-grid">
                      {fields
                        .filter((f) => f.group === group)
                        .map((f) => fieldCard(f, true))}
                    </div>
                  </div>
                ))}
                <div className="review-section">
                  <h3>Visit category</h3>
                  <label htmlFor="category">
                    Choose the primary reason for this visit
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="review-section">
                  <h3>Immediate attention</h3>
                  <div className="choice-row">
                    <button
                      className={`secondary ${safety === false ? "chosen" : ""}`}
                      onClick={() => setSafety(false)}
                    >
                      I do not need immediate attention
                    </button>
                    <button
                      className={`secondary ${safety === true ? "chosen warning" : ""}`}
                      onClick={() => setSafety(true)}
                    >
                      I need staff help now
                    </button>
                  </div>
                  {safety && (
                    <p className="safety-alert" role="alert">
                      Your answer may require immediate attention. Please notify
                      our staff now.
                    </p>
                  )}
                </div>
                <div className="review-section summary">
                  <span className="eyebrow">
                    PRELIMINARY INTAKE SUMMARY · REQUIRES CLINICIAN VERIFICATION
                  </span>
                  <p>
                    {fields
                      .filter((f) => f.group === "story" && data[f.id]?.value)
                      .map((f) => `${f.label}: ${data[f.id]?.value}.`)
                      .join(" ") ||
                      "Your story will appear here when you add answers."}
                  </p>
                </div>
                <details className="original-transcript">
                  <summary>
                    Read original transcript ({segments.length} sections)
                  </summary>
                  {segments.map((s) => (
                    <p key={s.id}>{s.original}</p>
                  ))}
                </details>
                <div className="demo-consent">
                  <h3>Demo acknowledgment</h3>
                  <p>
                    This visual prototype uses sample information. It does not
                    submit records to the clinic. This acknowledgment is a test
                    placeholder, not a treatment consent.
                  </p>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                    />
                    I acknowledge this is a demonstration. (Version 0.1)
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={accurate}
                      onChange={(e) => {
                        setAccurate(e.target.checked);
                        if (e.target.checked)
                          setData((d) =>
                            Object.fromEntries(
                              Object.entries(d).map(([k, v]) => [
                                k,
                                { ...v, confirmed: true },
                              ]),
                            ),
                          );
                      }}
                    />
                    The information above is accurate to the best of my
                    knowledge.
                  </label>
                </div>
                {missing.length > 0 && (
                  <p className="missing-fields">
                    Still needed:{" "}
                    {missing.map((f) => f.label.toLowerCase()).join(", ")}.
                  </p>
                )}
              </section>
            )}
            {conflicts.length > 0 && (
              <section className="conflict-panel">
                <h3>
                  <AlertCircle size={18} />
                  Did you mean to update these answers?
                </h3>
                {conflicts.map((c) => (
                  <div className="conflict" key={c.id}>
                    <p>
                      <strong>
                        {fields.find((f) => f.id === c.id)?.label}
                      </strong>
                      <span>
                        Current: {data[c.id]?.value} · New: {c.value}
                      </span>
                    </p>
                    <button
                      className="secondary"
                      onClick={() => {
                        setConflicts((old) => old.filter((v) => v.id !== c.id));
                      }}
                    >
                      Keep current
                    </button>
                    <button
                      className="primary"
                      onClick={() => {
                        updateField(c.id, c.value);
                        setConflicts((old) => old.filter((v) => v.id !== c.id));
                      }}
                    >
                      Use new answer
                    </button>
                  </div>
                ))}
              </section>
            )}
            <footer>
              <span>
                <ShieldCheck size={16} />
                Synthetic demo · Your session clears after inactivity
              </span>
              <div>
                {stage !== "story" && (
                  <button
                    className="back-button"
                    onClick={() => {
                      stop();
                      setStage("story");
                    }}
                  >
                    <ArrowLeft size={16} />
                    Back to voice
                  </button>
                )}
                {stage === "review" ? (
                  <button
                    className="primary"
                    disabled={
                      missing.length > 0 ||
                      !accepted ||
                      !accurate ||
                      safety === null ||
                      conflicts.length > 0
                    }
                    onClick={complete}
                  >
                    Complete demo check-in
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <button
                    className="primary"
                    onClick={() => {
                      stop();
                      setStage(
                        stage === "story"
                          ? "identity"
                          : stage === "identity"
                            ? "health"
                            : "review",
                      );
                    }}
                  >
                    Continue
                    <ArrowRight size={17} />
                  </button>
                )}
              </div>
            </footer>
            <div className="prototype-note">
              VISUAL PROTOTYPE <span>·</span> Synthetic data only. Browser voice
              services may process audio. No clinic records are saved.
            </div>
          </main>
        )}
      </div>
      {consentModal && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-consent-title"
          >
            <button
              className="modal-close"
              aria-label="Close voice notice"
              onClick={() => setConsentModal(false)}
            >
              <X size={21} />
            </button>
            <span className="modal-icon">
              <Mic size={28} />
            </span>
            <div className="eyebrow">YOUR VOICE, YOUR CHOICE</div>
            <h2 id="voice-consent-title">Let’s turn on your microphone.</h2>
            <p>
              This demo uses your browser’s speech service to transcribe what
              you say. Depending on your browser, audio may be processed by its
              provider.
            </p>
            <p>
              Use <strong>fictional patient information only</strong>. The app
              keeps the transcript in this session and does not store audio
              recordings.
            </p>
            <div className="modal-actions">
              <button
                className="secondary"
                onClick={() => setConsentModal(false)}
              >
                I’ll type instead
              </button>
              <button
                className="primary"
                onClick={() => {
                  setConsent(true);
                  consentRef.current = true;
                  setConsentModal(false);
                  start();
                }}
              >
                Enable voice
                <Mic size={17} />
              </button>
            </div>
          </section>
        </div>
      )}
      {edit && (
        <div className="modal-backdrop">
          <form
            className="modal edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                edit.id === "severity" &&
                editValue.trim() &&
                !/^(10|[0-9])$/.test(editValue.trim())
              )
                return;
              updateField(edit.id, editValue.trim());
              setEdit(null);
            }}
          >
            <button
              type="button"
              className="modal-close"
              aria-label="Close answer editor"
              onClick={() => setEdit(null)}
            >
              <X size={21} />
            </button>
            <div className="eyebrow">REVIEW YOUR ANSWER</div>
            <h2 id="edit-title">{edit.label}</h2>
            <label htmlFor="field-edit">{edit.placeholder}</label>
            <textarea
              autoFocus
              id="field-edit"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={3}
            />
            {edit.id === "severity" &&
              editValue.trim() &&
              !/^(10|[0-9])$/.test(editValue.trim()) && (
                <p className="safety-alert">
                  Enter a whole number from 0 to 10.
                </p>
              )}
            {data[edit.id]?.source &&
              data[edit.id]?.source !== "Patient entered or reviewed" && (
                <details>
                  <summary>Original source</summary>
                  <p>{data[edit.id]?.source}</p>
                </details>
              )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setEdit(null)}
              >
                Cancel
              </button>
              <button className="primary">
                Save reviewed answer
                <Check size={17} />
              </button>
            </div>
          </form>
        </div>
      )}
      <button
        className="reset-button"
        aria-label="Clear intake and start a new session"
        onClick={reset}
      >
        <RotateCcw size={15} />
        New session
      </button>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
