import messages from "./locales/en.json" with { type: "json" };
import { rows } from "./locales/translations.ts";
export type Locale = "en" | "es" | "ru";
export const speechLocales: Record<Locale, string> = {
  en: "en-US",
  es: "es-US",
  ru: "ru-RU",
};
export const catalog: Record<string, { es: string; ru: string }> = {};
for (const line of rows.trim().split("\n")) {
  const [id, es, ru] = line.split("|");
  if (!messages[+id] || !es || !ru || catalog[messages[+id]])
    throw new Error(`Invalid translation entry: ${id}`);
  catalog[messages[+id]] = { es, ru };
}
Object.assign(catalog, {
  LISTENING: { es: "ESCUCHANDO", ru: "СЛУШАЕМ" },
  STARTING: { es: "ACTIVANDO", ru: "ВКЛЮЧАЕМ" },
  PAUSED: { es: "EN PAUSA", ru: "ПАУЗА" },
  STOPPED: { es: "DETENIDO", ru: "ОСТАНОВЛЕНО" },
  SAMPLE: { es: "EJEMPLO", ru: "ПРИМЕР" },
  VOICE: { es: "VOZ", ru: "ГОЛОС" },
  TYPED: { es: "ESCRITO", ru: "ТЕКСТ" },
  READY: { es: "LISTO", ru: "ГОТОВО" },
  ATTENTION: { es: "ATENCIÓN", ru: "ТРЕБУЕТ ВНИМАНИЯ" },
  "Voice transcription follows the selected language. Original responses are preserved.":
    {
      es: "La transcripción de voz usa el idioma elegido. Se conservan las respuestas originales.",
      ru: "Речь распознаётся на выбранном языке. Исходные ответы сохраняются.",
    },
  "Choose an image smaller than 10 MB.": {
    es: "Elija una imagen de menos de 10 MB.",
    ru: "Выберите изображение размером меньше 10 МБ.",
  },
});
export function translate(text: string, locale: Locale): string {
  if (locale === "en") return text;
  const normalized = text.replace(/\s+/g, " ").trim();
  const entry = catalog[normalized];
  if (entry)
    return `${/^\s/.test(text) ? " " : ""}${entry[locale]}${/\s$/.test(text) ? " " : ""}`;
  const count = normalized.match(/^(\d+) sections?$/);
  if (count)
    return locale === "es"
      ? `${count[1]} ${count[1] === "1" ? "fragmento" : "fragmentos"}`
      : `${count[1]} ${+count[1] % 10 === 1 && +count[1] % 100 !== 11 ? "фрагмент" : +count[1] % 10 >= 2 && +count[1] % 10 <= 4 && !(+count[1] % 100 >= 12 && +count[1] % 100 <= 14) ? "фрагмента" : "фрагментов"}`;
  const conflictSuffix = " A different answer needs your confirmation.";
  if (normalized.endsWith(conflictSuffix))
    return (
      translate(normalized.slice(0, -conflictSuffix.length), locale) +
      (locale === "es"
        ? " Una respuesta diferente necesita su confirmación."
        : " Отличающийся ответ требует вашего подтверждения.")
    );
  const acknowledgment = normalized.match(
    /^I captured (.+)\. Please review the filled fields\.( A different answer needs your confirmation\.)?$/,
  );
  if (acknowledgment) {
    const parts = acknowledgment[1]
      .replace(/ and (\d+) more answers$/, "")
      .split(", ")
      .map((label) => {
        const key = Object.keys(catalog).find(
          (key) => key.toLowerCase() === label.toLowerCase(),
        );
        return key ? catalog[key][locale] : label;
      });
    const more = acknowledgment[1].match(/ and (\d+) more answers$/)?.[1];
    const listed =
      parts.join(", ") +
      (more
        ? locale === "es"
          ? ` y ${more} respuestas más`
          : ` и ещё ${more} ответов`
        : "");
    return locale === "es"
      ? `Registré: ${listed}. Revise los campos completados.${acknowledgment[2] ? " Una respuesta diferente necesita su confirmación." : ""}`
      : `Записано: ${listed}. Проверьте заполненные поля.${acknowledgment[2] ? " Отличающийся ответ требует вашего подтверждения." : ""}`;
  }
  // Unknown patient text must never be modified or guessed.
  return text;
}
