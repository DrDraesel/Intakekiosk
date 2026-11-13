import { useEffect, useRef, useState } from "react";
import {
  Mic,
  Pause,
  Play,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ShieldCheck,
  FileText,
  Headphones,
  Keyboard,
  RotateCcw,
  AlertCircle,
  Download,
  Upload,
  X,
  Plus,
} from "lucide-react";
import {
  fields,
  propose,
  SAMPLE,
  type RecordData,
  type FieldId,
  type Candidate,
} from "./intake";
import { extractLocalized } from "./multilingual";
import { translate, speechLocales, type Locale } from "./i18n";
import { glassText } from "./locales/glass";
import { browserSpeech, type Recognition } from "./voice";
import { MedicalSummary } from "./MedicalSummary";
import {
  intakeSections,
  answerStatus,
  followUps,
  makeSummaries,
  uncertain,
} from "./flow";
import { sealDraft, openDraft } from "./privateDraft";
import "./glass.css";

type Transcript = { text: string; at: string };
type Config = { enabled: boolean; destination: string; mode: "demo" | "live" };
type Delivery = "idle" | "sending" | "delivered" | "failed" | "unavailable";
export default function GlassIntake() {
  const [locale, setLocale] = useState<Locale>("en");
  const t = (s: string) => glassText(s, locale, translate);
  const [data, setData] = useState<RecordData>({});
  const dataRef = useRef(data);
  dataRef.current = data;
  const [conflicts, setConflicts] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<FieldId>("reason");
  const [activePrompt, setActivePrompt] = useState("");
  const [view, setView] = useState<"intake" | "review">("intake");
  const [summaryTab, setSummaryTab] = useState<"patient" | "doctor">("patient");
  const [answer, setAnswer] = useState("");
  const [editing, setEditing] = useState(false);
  const [transcript, setTranscript] = useState<Transcript[]>([]);
  const [interim, setInterim] = useState("");
  const [mic, setMic] = useState<"off" | "starting" | "listening" | "paused">(
    "off",
  );
  const recognition = useRef<Recognition | null>(null);
  const [voiceConsent, setVoiceConsent] = useState(false);
  const consent = useRef(false);
  consent.current = voiceConsent;
  const [consentModal, setConsentModal] = useState(false);
  const [notice, setNotice] = useState(
    "Start with what matters most to you. You can answer in any order.",
  );
  const [paused, setPaused] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [share, setShare] = useState(false);
  const [safety, setSafety] = useState<boolean | null>(null);
  const [delivery, setDelivery] = useState<Delivery>("idle");
  const [receipt, setReceipt] = useState("");
  const [config, setConfig] = useState<Config>({
    enabled: false,
    destination: "Not connected",
    mode: "demo",
  });
  const token = useRef("");
  const submissionId = useRef(crypto.randomUUID());
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const [draftModal, setDraftModal] = useState<"save" | "restore" | null>(null);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [draftError, setDraftError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLElement>(null);
  const selectedField = fields.find((f) => f.id === selected)!;
  const answered = fields.filter((f) => data[f.id]?.value).length;
  const missing = fields.filter((f) => f.required && !data[f.id]?.value);
  const follow = followUps(data);
  const conflictIds = conflicts.map((c) => c.id);
  useEffect(() => {
    if (!consentModal && !paused && !draftModal) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = modalRef.current;
    const focusable = () =>
      Array.from(
        modal?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
        ) || [],
      );
    focusable()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setConsentModal(false);
        setPaused(false);
        setDraftModal(null);
        setPassphrase("");
        setDraftFile(null);
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    modal?.addEventListener("keydown", trap);
    return () => {
      modal?.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [consentModal, paused, draftModal, busy]);
  function stop(pausing = false) {
    const r = recognition.current;
    recognition.current = null;
    r?.abort();
    setMic(pausing ? "paused" : "off");
    setInterim("");
  }
  function invalidate() {
    setReviewed(false);
    setShare(false);
    setDelivery("idle");
    setReceipt("");
    submissionId.current = crypto.randomUUID();
  }
  function select(id: FieldId, prompt = "") {
    stop();
    setSelected(id);
    setActivePrompt(prompt);
    setAnswer("");
    setEditing(false);
    setView("intake");
  }
  function capture(
    text: string,
    context: FieldId | null = selected,
    exact = false,
  ) {
    if (!text.trim() || inFlight.current) return;
    invalidate();
    const original = text.trim();
    const at = new Date().toISOString();
    setTranscript((old) => [...old, { text: original, at }]);
    const candidates = exact
      ? [{ id: selected, value: original, source: original }]
      : extractLocalized(original, context, locale);
    const proposal = propose(
      exact ? { ...dataRef.current, [selected]: undefined } : dataRef.current,
      candidates,
    );
    const next = { ...dataRef.current };
    for (const c of proposal.updates)
      next[c.id] = {
        value: c.value,
        source: c.source,
        confirmed: exact && !uncertain(c.value),
        timestamp: at,
      };
    dataRef.current = next;
    setData(next);
    setConflicts((old) => [
      ...old.filter(
        (c) =>
          !proposal.conflicts.some((n) => n.id === c.id) &&
          !(exact && c.id === selected),
      ),
      ...proposal.conflicts,
    ]);
    setNotice(
      proposal.conflicts.length
        ? "Different answers need your confirmation. Your previous answer has been kept."
        : proposal.updates.length
          ? "Your words were added to the matching fields. Please review them."
          : "Your words are in the transcript. Choose a question to add the detail.",
    );
    setAnswer("");
    setEditing(false);
  }
  const captureRef = useRef(capture);
  captureRef.current = capture;
  function start() {
    if (!consent.current) {
      setConsentModal(true);
      return;
    }
    if (!browserSpeech.supported()) {
      setNotice(
        "Voice is unavailable in this browser. You can type every answer.",
      );
      return;
    }
    stop();
    const r = browserSpeech.create()!;
    recognition.current = r;
    r.lang = speechLocales[locale];
    r.continuous = true;
    r.interimResults = true;
    r.onstart = () => {
      if (recognition.current === r) setMic("listening");
    };
    r.onresult = (e) => {
      if (recognition.current !== r) return;
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal)
          captureRef.current(e.results[i][0].transcript, selected);
        else live += e.results[i][0].transcript;
      }
      setInterim(live);
    };
    r.onerror = () => {
      if (recognition.current !== r) return;
      stop();
      setNotice(
        "Recording stopped. Check microphone permission, try again, or type your answer.",
      );
    };
    r.onend = () => {
      if (recognition.current === r) {
        recognition.current = null;
        setMic("paused");
        setInterim("");
      }
    };
    setMic("starting");
    try {
      r.start();
    } catch {
      stop();
      setNotice(
        "Voice is unavailable in this browser. You can type every answer.",
      );
    }
  }
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = "IMW · " + t("Patient intake");
  }, [locale]);
  useEffect(() => {
    mounted.current = true;
    const params = new URLSearchParams(location.hash.slice(1));
    token.current = params.get("intake_token") || "";
    if (token.current)
      history.replaceState(null, "", location.pathname + location.search);
    const controller = new AbortController();
    fetch("/api/intake-config", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((c) => {
        if (mounted.current)
          setConfig({
            enabled: c.enabled === true,
            destination:
              typeof c.destination === "string"
                ? c.destination
                : "Not connected",
            mode: c.enabled ? "live" : "demo",
          });
      })
      .catch(() => {});
    return () => {
      mounted.current = false;
      controller.abort();
      recognition.current?.abort();
    };
  }, []);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        stop();
        setData({});
        dataRef.current = {};
        setTranscript([]);
        setConflicts([]);
        setAnswer("");
        setVoiceConsent(false);
        setReviewed(false);
        setShare(false);
        setSafety(null);
        setPaused(false);
        setDelivery("idle");
        setReceipt("");
        setPassphrase("");
        setDraftModal(null);
        setDraftFile(null);
        setSelected("reason");
        setEditing(false);
        setView("intake");
        setNotice(
          "Your private session was cleared after 10 minutes of inactivity.",
        );
      }, 600000);
    };
    refresh();
    window.addEventListener("pointerdown", refresh);
    window.addEventListener("keydown", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", refresh);
      window.removeEventListener("keydown", refresh);
    };
  }, []);
  function confirmAnswer(id: FieldId, value?: string) {
    invalidate();
    setData((old) => {
      const item = old[id];
      if (!item && !value) return old;
      const next = {
        ...old,
        [id]: {
          value: value || item!.value,
          source: value || item!.source,
          confirmed: true,
          timestamp: new Date().toISOString(),
        },
      };
      dataRef.current = next;
      return next;
    });
    setConflicts((old) => old.filter((c) => c.id !== id));
  }
  async function submit() {
    if (
      inFlight.current ||
      !reviewed ||
      !share ||
      missing.length ||
      conflicts.length ||
      safety === null
    )
      return;
    stop();
    if (!config.enabled || !token.current) {
      setDelivery("unavailable");
      return;
    }
    inFlight.current = true;
    setDelivery("sending");
    try {
      const confirmed = Object.fromEntries(
        Object.entries(data).map(([id, a]) => [id, { ...a, confirmed: true }]),
      );
      const response = await fetch("/api/intake-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.current}`,
          "Idempotency-Key": submissionId.current,
        },
        body: JSON.stringify({
          version: 1,
          submissionId: submissionId.current,
          locale,
          answers: confirmed,
          summaries: makeSummaries(confirmed, locale),
          confirmation: {
            reviewed: true,
            share: true,
            confirmedAt: new Date().toISOString(),
          },
          immediateAttention: safety,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const body = await response.json();
      if (
        !response.ok ||
        body.status !== "accepted" ||
        typeof body.receiptId !== "string"
      )
        throw Error("delivery");
      if (mounted.current) {
        setReceipt(body.receiptId);
        setDelivery("delivered");
        setData(confirmed);
      }
    } catch {
      if (mounted.current) setDelivery("failed");
    } finally {
      inFlight.current = false;
    }
  }
  async function privateDraft() {
    setBusy(true);
    setDraftError("");
    stop();
    try {
      if (draftModal === "save") {
        const contents = await sealDraft(
          { version: 1, data, transcript, conflicts, locale, selected, safety },
          passphrase,
        );
        const url = URL.createObjectURL(
          new Blob([contents], { type: "application/json" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "imw-private-intake.imw";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice(
          "Encrypted draft saved. Keep your passphrase separately; the clinic cannot recover it.",
        );
      } else {
        if (!draftFile) throw Error("file");
        const saved = await openDraft(await draftFile.text(), passphrase);
        if (
          saved.version !== 1 ||
          !saved.data ||
          Array.isArray(saved.data) ||
          typeof saved.data !== "object" ||
          !Array.isArray(saved.transcript)
        )
          throw Error("format");
        const restored: RecordData = {};
        for (const f of fields) {
          const a = saved.data[f.id];
          if (a) {
            if (
              typeof a.value !== "string" ||
              a.value.length > 5000 ||
              typeof a.source !== "string" ||
              a.source.length > 15000
            )
              throw Error("format");
            restored[f.id] = {
              ...a,
              confirmed: false,
              timestamp: new Date().toISOString(),
            };
          }
        }
        const logs = saved.transcript
          .filter(
            (s: Transcript) =>
              typeof s.text === "string" &&
              s.text.length <= 15000 &&
              typeof s.at === "string",
          )
          .slice(0, 300);
        setData(restored);
        dataRef.current = restored;
        setTranscript(logs);
        setConflicts(
          Array.isArray(saved.conflicts)
            ? saved.conflicts.filter(
                (c: Candidate) =>
                  fields.some((f) => f.id === c.id) &&
                  typeof c.value === "string" &&
                  c.value.length <= 5000 &&
                  typeof c.source === "string" &&
                  c.source.length <= 15000,
              )
            : [],
        );
        setLocale(
          ["en", "es", "ru"].includes(saved.locale) ? saved.locale : "en",
        );
        setSafety(typeof saved.safety === "boolean" ? saved.safety : null);
        setSelected("reason");
        setVoiceConsent(false);
        setPaused(false);
        setView("intake");
        setAnswer("");
        invalidate();
        setNotice(
          "Draft restored. Review the answers and grant microphone consent again if you want to speak.",
        );
      }
      setDraftModal(null);
      setPassphrase("");
      setDraftFile(null);
    } catch {
      setDraftError(
        "Could not open or save the draft. Check the file and use a passphrase of at least 12 characters.",
      );
    } finally {
      setBusy(false);
    }
  }
  const locked = delivery === "sending" || delivery === "delivered";
  return (
    <div className="glass-app">
      <header
        className="glass-header"
        inert={consentModal || paused || !!draftModal}
      >
        <a
          className="glass-brand"
          href="#"
          aria-label="Innovative Medical Wellness"
        >
          <span className="brand-symbol">
            i<span>+</span>
          </span>
          <span>
            IMW<span>{t("Patient intake")}</span>
          </span>
        </a>
        <div className="header-right">
          <span className="private-badge">
            <ShieldCheck size={16} />
            {t("Your words. Your control.")}
          </span>
          <label className="language-select">
            <span className="sr-only">Language · Idioma · Язык</span>
            <select
              aria-label="Language · Idioma · Язык"
              value={locale}
              disabled={locked}
              onChange={(e) => {
                stop();
                setLocale(e.target.value as Locale);
                invalidate();
              }}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="ru">Русский</option>
            </select>
          </label>
        </div>
      </header>
      <div
        className="glass-layout"
        inert={consentModal || paused || !!draftModal}
      >
        <aside className="intake-nav" aria-label={t("Intake questions")}>
          <div className="nav-top">
            <span className="overline">{t("A LITTLE ABOUT YOU")}</span>
            <h2>{t("One step at a time.")}</h2>
            <p>{t("Speak freely. We’ll help organize the details.")}</p>
            <div className="completion-line">
              <span>
                {answered} / {fields.length} {t("answered")}
              </span>
              <strong>{Math.round((answered / fields.length) * 100)}%</strong>
            </div>
            <progress
              value={answered}
              max={fields.length}
              aria-label={t("Intake progress")}
            />
            <div className="status-legend">
              <span>
                <i className="status-dot complete" />
                {t("Complete")}
              </span>
              <span>
                <i className="status-dot incomplete" />
                {t("Incomplete")}
              </span>
              <span>
                <i className="status-dot" />
                {t("Unanswered")}
              </span>
            </div>
          </div>
          <nav className="questions-list">
            {intakeSections.map((section, index) => {
              const sectionFields = section.ids.map(
                (id) => fields.find((f) => f.id === id)!,
              );
              const done = sectionFields.filter(
                (f) => data[f.id]?.confirmed && !conflictIds.includes(f.id),
              ).length;
              return (
                <details
                  className="question-group"
                  key={section.id}
                  open={section.ids.includes(selected as never) || undefined}
                >
                  <summary>
                    <span className="section-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      {t(section.title)}
                      <small>
                        {done}/{sectionFields.length} {t("reviewed")}
                      </small>
                    </span>
                    <ChevronDown size={14} />
                  </summary>
                  <div>
                    {sectionFields.map((f) => {
                      const status = answerStatus(data, f.id, conflictIds);
                      return (
                        <button
                          key={f.id}
                          className={`question-link ${selected === f.id && view === "intake" ? "active" : ""}`}
                          disabled={locked}
                          onClick={() => select(f.id)}
                          aria-current={
                            selected === f.id && view === "intake"
                              ? "step"
                              : undefined
                          }
                        >
                          <span
                            className={`status-dot ${status === "Complete" ? "complete" : status === "Unanswered" ? "" : "incomplete"}`}
                          >
                            {status === "Complete" && <Check size={10} />}
                          </span>
                          <span>
                            {t(f.label)}
                            {f.required && (
                              <span aria-label={t("Required")}> *</span>
                            )}
                            <small>{t(status)}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </nav>
          <div className="nav-bottom">
            <button
              className={`review-nav ${view === "review" ? "active" : ""}`}
              onClick={() => {
                stop();
                setView("review");
              }}
            >
              <FileText size={18} />
              {t("Review & share")}
              <ArrowRight size={16} />
            </button>
            <p>
              <ShieldCheck size={14} />
              {t("You review everything before sharing.")}
            </p>
          </div>
        </aside>
        <main className="intake-main">
          <div className="page-eyebrow">
            <span>
              <i className="orange-dot" />
              {t("WELCOME TO INNOVATIVE MEDICAL WELLNESS")}
            </span>
            <span className="session-label">
              {config.enabled
                ? t("Private intake")
                : t("Demonstration · fictional information only")}
            </span>
          </div>
          {view === "intake" ? (
            <>
              <div className="hero-heading">
                <div>
                  <h1>
                    {t("Let’s start with")}
                    <br />
                    <em>{t("your story.")}</em>
                  </h1>
                  <p>
                    {t(
                      "Tell us what brings you in. There’s no wrong place to begin.",
                    )}
                  </p>
                </div>
                <span className="hero-tag">
                  <Headphones size={18} />
                  {t("Here to listen")}
                </span>
              </div>
              <section
                className={`voice-card ${mic === "listening" ? "recording" : ""}`}
                aria-label={t("Speak or type your answers")}
              >
                <div className="voice-card-top">
                  <span className="overline">
                    {t("YOUR VOICE, AT YOUR PACE")}
                  </span>
                  <span
                    className={`mic-state ${mic === "listening" ? "live" : ""}`}
                    role="status"
                  >
                    <i />
                    {t(
                      mic === "listening"
                        ? "Recording"
                        : mic === "starting"
                          ? "Starting microphone"
                          : mic === "paused"
                            ? "Paused"
                            : "Microphone off",
                    )}
                  </span>
                </div>
                <div className="mic-stage">
                  <span className="mic-orbit orbit-one" />
                  <span className="mic-orbit orbit-two" />
                  <button
                    className="mic-orb"
                    disabled={locked || paused}
                    onClick={() =>
                      mic === "listening" || mic === "starting"
                        ? stop(true)
                        : start()
                    }
                    aria-label={t(
                      mic === "listening"
                        ? "Pause recording"
                        : "Start recording",
                    )}
                  >
                    {mic === "listening" ? (
                      <Pause size={37} />
                    ) : (
                      <Mic size={40} />
                    )}
                  </button>
                  <div
                    className={`waveform ${mic === "listening" ? "live" : ""}`}
                    aria-hidden="true"
                  >
                    {Array.from({ length: 35 }, (_, i) => (
                      <i
                        key={i}
                        style={{
                          height: `${8 + ((i * 17) % 37)}px`,
                          animationDelay: `${i * 0.065}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <h2>
                  {t(
                    mic === "listening"
                      ? "We’re listening. Take your time."
                      : "A conversation, not a questionnaire.",
                  )}
                </h2>
                <p>
                  {t(
                    "Describe your concern, medications, or history in your own words.",
                  )}
                </p>
                <div className="voice-actions">
                  <button
                    className="orange-button"
                    disabled={locked || paused || mic === "starting"}
                    onClick={() => (mic === "listening" ? stop(true) : start())}
                  >
                    {mic === "listening" ? (
                      <Pause size={17} />
                    ) : (
                      <Mic size={17} />
                    )}{" "}
                    {t(
                      mic === "listening"
                        ? "Pause recording"
                        : mic === "paused"
                          ? "Resume recording"
                          : "Start speaking",
                    )}
                  </button>
                  <span>{t("or")}</span>
                  <button
                    className="text-button"
                    onClick={() => {
                      stop();
                      document.getElementById("focused-answer")?.focus();
                    }}
                    disabled={locked}
                  >
                    <Keyboard size={17} />
                    {t("I’d rather type")}
                  </button>
                </div>
                <div className="voice-privacy">
                  <ShieldCheck size={14} />
                  {t(
                    "Microphone starts only with your permission. Audio is not saved by this app.",
                  )}
                </div>
              </section>
              <section className="transcript-card">
                <div className="section-heading">
                  <h2>
                    <FileText size={18} />
                    {t("Your live transcript")}
                  </h2>
                  <span>{t("Original words")}</span>
                </div>
                <div
                  className="transcript-content"
                  aria-live="polite"
                  aria-relevant="additions text"
                >
                  {transcript.length ? (
                    transcript.slice(-4).map((s, i) => (
                      <p key={i} translate="no">
                        {s.text}
                      </p>
                    ))
                  ) : (
                    <p className="empty-transcript">
                      {t(
                        "Your words will appear here as you speak. You can also type below.",
                      )}
                    </p>
                  )}
                  {interim && (
                    <p className="interim" translate="no">
                      {interim}
                    </p>
                  )}
                </div>
                {transcript.length > 4 && (
                  <details>
                    <summary>{t("Read the full transcript")}</summary>
                    {transcript.slice(0, -4).map((s, i) => (
                      <p key={i} translate="no">
                        {s.text}
                      </p>
                    ))}
                  </details>
                )}
              </section>
              <div className="capture-notice" role="status">
                <CheckCircle2 size={17} />
                <span>{t(notice)}</span>
              </div>
              <section className="focused-card">
                <div className="section-heading">
                  <span className="overline">
                    {t("LET’S FILL IN THE DETAILS")}
                  </span>
                  <span className="answer-state">
                    {t(answerStatus(data, selected, conflictIds))}
                  </span>
                </div>
                <h2>
                  {t(
                    activePrompt ||
                      selectedField.question ||
                      selectedField.placeholder,
                  )}
                </h2>
                <p>
                  {t(selectedField.label)} ·{" "}
                  {t(selectedField.required ? "Required" : "Optional")}
                </p>
                {data[selected]?.value && (
                  <div className="captured-answer">
                    <span>{t("You told us")}</span>
                    <p translate="no">{data[selected]?.value}</p>
                    <div className="inline-actions">
                      <button
                        className="text-button"
                        disabled={locked}
                        onClick={() => {
                          setEditing(true);
                          setAnswer(data[selected]!.value);
                        }}
                      >
                        {t("Edit answer")}
                      </button>
                      <button
                        className="text-button"
                        disabled={locked}
                        onClick={() => confirmAnswer(selected)}
                      >
                        <Check size={16} />
                        {t(
                          uncertain(data[selected]!.value)
                            ? "Confirm uncertainty"
                            : "Confirm answer",
                        )}
                      </button>
                    </div>
                  </div>
                )}
                <label htmlFor="focused-answer">
                  {t(editing ? "Edit this answer" : "Your answer")}
                </label>
                <textarea
                  id="focused-answer"
                  value={answer}
                  disabled={locked || paused}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={t(selectedField.placeholder)}
                  maxLength={5000}
                />
                <div className="focused-actions">
                  <button
                    className="dark-button"
                    disabled={!answer.trim() || locked}
                    onClick={() => capture(answer, selected, editing)}
                  >
                    {t(editing ? "Save correction" : "Add answer")}
                    <Plus size={16} />
                  </button>
                  <button
                    className="text-button"
                    disabled={locked}
                    onClick={() => {
                      const index = fields.findIndex((f) => f.id === selected);
                      const next = [
                        ...fields.slice(index + 1),
                        ...fields.slice(0, index + 1),
                      ].find((f) => !data[f.id]?.value);
                      if (next) select(next.id);
                      else {
                        stop();
                        setView("review");
                      }
                    }}
                  >
                    {t("Next unanswered question")}
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="quick-answers">
                  {["Unknown", "Prefer not to answer", "None reported"].map(
                    (value) => (
                      <button
                        key={value}
                        disabled={locked}
                        onClick={() => capture(t(value), selected, true)}
                      >
                        {t(value)}
                      </button>
                    ),
                  )}
                </div>
                {conflicts
                  .filter((c) => c.id === selected)
                  .map((c) => (
                    <div className="conflict-box" key={c.id}>
                      <strong>
                        <AlertCircle size={17} />
                        {t("Which answer should we keep?")}
                      </strong>
                      <p>
                        {t("Previous answer")}:{" "}
                        <span translate="no">{data[c.id]?.value}</span>
                      </p>
                      <p>
                        {t("New answer")}: <span translate="no">{c.value}</span>
                      </p>
                      <button
                        disabled={locked}
                        className="text-button"
                        onClick={() => confirmAnswer(c.id)}
                      >
                        {t("Keep previous answer")}
                      </button>
                      <button
                        disabled={locked}
                        className="text-button"
                        onClick={() => confirmAnswer(c.id, c.value)}
                      >
                        {t("Use new answer")}
                      </button>
                    </div>
                  ))}
              </section>
              {follow.length > 0 && (
                <section className="followup-card">
                  <span className="overline">
                    {t("A FEW HELPFUL FOLLOW-UPS")}
                  </span>
                  <h2>{t("Help us understand a little better.")}</h2>
                  {follow.slice(0, 3).map((f, i) => (
                    <button
                      key={f.id + i}
                      onClick={() => select(f.id, f.prompt)}
                      disabled={locked}
                    >
                      <span>
                        <small>
                          {t(fields.find((x) => x.id === f.id)!.label)}
                        </small>
                        {t(f.prompt)}
                      </span>
                      <ArrowRight size={18} />
                    </button>
                  ))}
                </section>
              )}
              <div className="bottom-actions">
                <button
                  className="text-button"
                  disabled={locked}
                  onClick={() => {
                    stop(true);
                    setPaused(true);
                  }}
                >
                  <Pause size={16} />
                  {t("Pause intake")}
                </button>
                <button
                  className="orange-button"
                  onClick={() => {
                    stop();
                    setView("review");
                  }}
                >
                  {t("Review my intake")}
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="hero-heading">
                <div>
                  <h1>
                    {t("Your story,")}
                    <br />
                    <em>{t("ready to review.")}</em>
                  </h1>
                  <p>
                    {t(
                      "Check your answers. You can change or add anything before sharing.",
                    )}
                  </p>
                </div>
              </div>
              <div
                className="review-tabs"
                role="tablist"
                aria-label={t("Intake summaries")}
              >
                <button
                  role="tab"
                  aria-selected={summaryTab === "patient"}
                  aria-controls="patient-summary"
                  id="patient-tab"
                  onClick={() => setSummaryTab("patient")}
                >
                  {t("Patient summary")}
                </button>
                <button
                  role="tab"
                  aria-selected={summaryTab === "doctor"}
                  aria-controls="doctor-summary"
                  id="doctor-tab"
                  onClick={() => setSummaryTab("doctor")}
                >
                  {t("Doctor summary")}
                </button>
              </div>
              {summaryTab === "patient" ? (
                <section
                  className="patient-summary"
                  role="tabpanel"
                  id="patient-summary"
                  aria-labelledby="patient-tab"
                >
                  <span className="overline">{t("IN YOUR OWN WORDS")}</span>
                  <h2>{t("Here’s what you shared.")}</h2>
                  <p>
                    {t("This is a summary of your answers, not a diagnosis.")}
                  </p>
                  {intakeSections.map((section) => (
                    <section key={section.id}>
                      <h3>{t(section.title)}</h3>
                      {section.ids.filter((id) => data[id]?.value).length ? (
                        section.ids
                          .filter((id) => data[id]?.value)
                          .map((id) => (
                            <div className="patient-summary-row" key={id}>
                              <div>
                                <strong>
                                  {t(fields.find((f) => f.id === id)!.label)}
                                </strong>
                                <p translate="no">{data[id]?.value}</p>
                                <small>
                                  {t(
                                    data[id]?.confirmed
                                      ? "Patient confirmed"
                                      : "Patient reported · needs review",
                                  )}
                                </small>
                              </div>
                              <button
                                className="text-button"
                                disabled={locked}
                                onClick={() => select(id)}
                              >
                                {t("Edit answer")}
                              </button>
                            </div>
                          ))
                      ) : (
                        <p className="not-provided">
                          {t(
                            "You haven’t shared details for this section yet.",
                          )}
                        </p>
                      )}
                      <button
                        className="text-button"
                        disabled={locked}
                        onClick={() =>
                          select(
                            section.ids.find((id) => !data[id]?.value) ||
                              section.ids[0],
                          )
                        }
                      >
                        <Plus size={15} />
                        {t("Add details")}
                      </button>
                    </section>
                  ))}
                </section>
              ) : (
                <section
                  role="tabpanel"
                  id="doctor-summary"
                  aria-labelledby="doctor-tab"
                  className="doctor-summary"
                >
                  <div className="provenance">
                    <ShieldCheck size={20} />
                    <div>
                      <strong>{t("Source: patient reported")}</strong>
                      <p>
                        {t(
                          "No connected medical records have been imported or verified. Patient confirmation does not mean clinician or record verification.",
                        )}
                      </p>
                    </div>
                  </div>
                  <MedicalSummary
                    data={data}
                    locale={locale}
                    safety={safety}
                    conflictCount={conflicts.length}
                  />
                </section>
              )}
              {conflicts.length > 0 && (
                <div className="blocking-note" role="alert">
                  <AlertCircle size={20} />
                  <div>
                    <strong>
                      {t("Resolve different answers before sharing.")}
                    </strong>
                    {conflicts.map((c) => (
                      <button
                        className="text-button"
                        key={c.id}
                        onClick={() => select(c.id)}
                      >
                        {t(fields.find((f) => f.id === c.id)!.label)}
                        <ArrowRight size={15} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <section className="share-card">
                <h2>{t("You decide what happens next.")}</h2>
                <p>{t("Do you need immediate staff help?")}</p>
                <div className="safety-choices">
                  <button
                    disabled={locked}
                    className={safety === false ? "chosen" : ""}
                    onClick={() => {
                      setSafety(false);
                      invalidate();
                    }}
                  >
                    {t("No")}
                  </button>
                  <button
                    disabled={locked}
                    className={safety === true ? "chosen" : ""}
                    onClick={() => {
                      setSafety(true);
                      invalidate();
                    }}
                  >
                    {t("Yes, I need help")}
                  </button>
                </div>
                {safety && (
                  <p className="blocking-note" role="alert">
                    {t(
                      "Please tell clinic staff now. If this is a medical emergency, contact local emergency services. This app is not monitored for emergencies.",
                    )}
                  </p>
                )}
                {missing.length > 0 && (
                  <div className="missing-fields">
                    <strong>{t("Still needed")}</strong>
                    {missing.map((f) => (
                      <button
                        className="text-button"
                        key={f.id}
                        disabled={locked}
                        onClick={() => select(f.id)}
                      >
                        {t(f.label)}
                        <ArrowRight size={14} />
                      </button>
                    ))}
                  </div>
                )}
                <label className="consent-check">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    disabled={locked}
                    onChange={(e) => {
                      setReviewed(e.target.checked);
                      if (e.target.checked) {
                        const confirmed = Object.fromEntries(
                          Object.entries(data).map(([id, a]) => [
                            id,
                            { ...a, confirmed: true },
                          ]),
                        ) as RecordData;
                        setData(confirmed);
                        dataRef.current = confirmed;
                      }
                      setDelivery("idle");
                    }}
                  />
                  <span>
                    {t(
                      "I reviewed my answers and summaries. They are accurate to the best of my knowledge, including anything marked unknown.",
                    )}
                  </span>
                </label>
                <label className="consent-check">
                  <input
                    type="checkbox"
                    checked={share}
                    disabled={locked}
                    onChange={(e) => {
                      setShare(e.target.checked);
                      setDelivery("idle");
                    }}
                  />
                  <span>
                    {t(
                      "I agree to share these confirmed answers and both summaries with the configured clinic connector. Audio is not included.",
                    )}
                  </span>
                </label>
                <div className="destination">
                  <ShieldCheck size={19} />
                  <div>
                    <strong>
                      {t("Destination")}:{" "}
                      {config.enabled ? config.destination : t("Not connected")}
                    </strong>
                    <p>
                      {config.enabled
                        ? t(
                            "A clinic invitation is required for secure delivery.",
                          )
                        : t(
                            "EHR delivery is not configured. Nothing is sent or saved to a medical record.",
                          )}
                    </p>
                  </div>
                </div>
                <button
                  className="orange-button share-button"
                  disabled={
                    locked ||
                    !reviewed ||
                    !share ||
                    missing.length > 0 ||
                    conflicts.length > 0 ||
                    safety === null
                  }
                  onClick={submit}
                >
                  {delivery === "sending"
                    ? t("Sending confirmed intake…")
                    : t("Submit confirmed intake")}
                  <ArrowRight size={17} />
                </button>
                <div
                  role="status"
                  aria-live="polite"
                  className={`delivery-status ${delivery}`}
                >
                  {delivery === "delivered" && (
                    <>
                      <CheckCircle2 size={21} />
                      <div>
                        <strong>{t("Received by the clinic connector")}</strong>
                        <p>
                          {t("Receipt")}: <span translate="no">{receipt}</span>
                        </p>
                        <p>
                          {t(
                            "The connector has acknowledged receipt. This does not confirm a clinician has reviewed it.",
                          )}
                        </p>
                      </div>
                    </>
                  )}
                  {delivery === "sending" && (
                    <p>
                      {t(
                        "Please keep this page open while we check the delivery receipt.",
                      )}
                    </p>
                  )}
                  {(delivery === "failed" || delivery === "unavailable") && (
                    <div>
                      <strong>
                        {t(
                          delivery === "failed"
                            ? "Delivery could not be confirmed."
                            : "Delivery unavailable.",
                        )}
                      </strong>
                      <p>
                        {t(
                          delivery === "failed"
                            ? "Your intake is still here. Retry sends the same submission ID to help prevent duplicates."
                            : "Ask the clinic for a configured intake invitation. Your answers have not been sent.",
                        )}
                      </p>
                      <button className="text-button" onClick={submit}>
                        <RotateCcw size={15} />
                        {t("Retry delivery")}
                      </button>
                    </div>
                  )}
                </div>
              </section>
              <button
                className="text-button"
                onClick={() => setView("intake")}
                disabled={locked}
              >
                <ArrowLeft size={16} />
                {t("Back to my answers")}
              </button>
            </>
          )}
          <footer className="glass-footer">
            <div>
              <ShieldCheck size={15} />
              <p>
                {t(
                  "Private by design. Answers stay in this tab until you confirm sharing. Inactive sessions clear after 10 minutes.",
                )}
              </p>
            </div>
            <div className="footer-tools">
              <button
                disabled={locked}
                onClick={() => {
                  stop();
                  setDraftModal("save");
                  setDraftError("");
                }}
              >
                <Download size={15} />
                {t("Save encrypted draft")}
              </button>
              <button
                disabled={locked}
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={15} />
                {t("Resume from draft")}
              </button>
              {!config.enabled && (
                <button
                  disabled={locked}
                  onClick={() => capture(t(SAMPLE), null)}
                >
                  {t("Try a sample")}
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInput}
              hidden
              accept=".imw,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  stop();
                  setDraftFile(file);
                  setDraftModal("restore");
                  setDraftError("");
                }
                e.target.value = "";
              }}
            />
            <p className="clinical-note">
              {t(
                "This application supports intake and clinical review. It does not diagnose conditions or replace medical care.",
              )}
            </p>
          </footer>
        </main>
      </div>
      {(consentModal || paused || draftModal) && (
        <div className="glass-modal-backdrop">
          <section
            className="glass-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-heading"
          >
            <button
              className="modal-close"
              aria-label={t("Close dialog")}
              disabled={busy}
              onClick={() => {
                setConsentModal(false);
                setPaused(false);
                setDraftModal(null);
                setPassphrase("");
                setDraftFile(null);
              }}
            >
              <X size={21} />
            </button>
            {consentModal ? (
              <>
                <span className="modal-icon">
                  <Mic size={30} />
                </span>
                <h2 id="modal-heading">{t("Your microphone, your choice.")}</h2>
                <p>
                  {t(
                    "With your consent, your browser’s speech service will process your microphone audio to create a live transcript in the selected language. The provider may process audio on its servers.",
                  )}
                </p>
                <p>
                  {t(
                    "This app keeps the transcript and extracted answers in this tab. It does not save audio recordings. Only confirmed answers and summaries are sent when you separately consent to sharing.",
                  )}
                </p>
                <p>
                  {config.enabled
                    ? t(
                        "Use the clinic-approved browser and intake invitation.",
                      )
                    : t("Demonstration mode: use fictional information only.")}
                </p>
                <button
                  className="orange-button"
                  onClick={() => {
                    setVoiceConsent(true);
                    consent.current = true;
                    setConsentModal(false);
                    start();
                  }}
                >
                  {t("I consent — start microphone")}
                  <Mic size={16} />
                </button>
                <button
                  className="text-button"
                  onClick={() => setConsentModal(false)}
                >
                  {t("I’d rather type")}
                </button>
              </>
            ) : paused ? (
              <>
                <span className="modal-icon">
                  <Pause size={30} />
                </span>
                <h2 id="modal-heading">{t("Take a moment. We’ll be here.")}</h2>
                <p>
                  {t(
                    "Recording is off. You can resume in this tab. For later, save a passphrase-protected draft before leaving; otherwise this tab clears after 10 minutes of inactivity.",
                  )}
                </p>
                <button
                  className="orange-button"
                  onClick={() => setPaused(false)}
                >
                  <Play size={16} />
                  {t("Resume intake")}
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setPaused(false);
                    setDraftModal("save");
                    setDraftError("");
                  }}
                >
                  <Download size={16} />
                  {t("Save encrypted draft")}
                </button>
              </>
            ) : (
              <>
                <span className="modal-icon">
                  <ShieldCheck size={30} />
                </span>
                <h2 id="modal-heading">
                  {t(
                    draftModal === "save"
                      ? "Keep your place, privately."
                      : "Welcome back.",
                  )}
                </h2>
                <p>
                  {t(
                    "Use a passphrase of at least 12 characters. The draft is encrypted on this device. Keep the file and passphrase safe; neither is sent to the clinic.",
                  )}
                </p>
                <label htmlFor="draft-passphrase">
                  {t("Draft passphrase")}
                </label>
                <input
                  id="draft-passphrase"
                  type="password"
                  value={passphrase}
                  autoComplete="off"
                  minLength={12}
                  onChange={(e) => setPassphrase(e.target.value)}
                  autoFocus
                />
                {draftError && <p role="alert">{t(draftError)}</p>}
                <button
                  className="orange-button"
                  disabled={busy || passphrase.length < 12}
                  onClick={privateDraft}
                >
                  {t(
                    busy
                      ? "Working…"
                      : draftModal === "save"
                        ? "Download encrypted draft"
                        : "Restore encrypted draft",
                  )}
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
