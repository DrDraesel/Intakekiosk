import { extract, fields, type Candidate, type FieldId } from "./intake.ts";
import type { Locale } from "./i18n.ts";

// Bounded native-language phrase mapping, with explicit question-context fallback.
// Original text is evidence; no automatic translation or clinical inference is made.
const patterns: Record<"es" | "ru", [FieldId, RegExp][]> = {
  es: [
    ["name", /^(?:me llamo|mi nombre es)\s+(.+)/iu],
    ["dob", /(?:mi fecha de nacimiento es|nací el|naci el)\s+(.+)/iu],
    [
      "phone",
      /(?:mi (?:número de )?tel[eé]fono es|mi n[uú]mero es)\s+([+\d()\s-]{7,22})/iu,
    ],
    ["address", /(?:mi direcci[oó]n es|vivo en)\s+(.+)/iu],
    ["insurance", /(?:mi seguro es|mi aseguradora es)\s+(.+)/iu],
    ["memberId", /(?:mi n[uú]mero de (?:afiliado|p[oó]liza) es)\s+(.+)/iu],
    ["reason", /(?:vengo por|estoy aqu[ií] por|vine por)\s+(.+)/iu],
    ["onset", /(?:empez[oó]|comenz[oó]|el dolor comenz[oó]|desde)\s+(.+)/iu],
    ["medications", /(?:^tomo|estoy tomando|mis medicamentos son)\s+(.+)/iu],
    [
      "allergies",
      /(?:soy al[eé]rgic[oa] a|tengo alergia a|mis alergias son)\s+(.+)/iu,
    ],
    [
      "history",
      /(?:mis antecedentes m[eé]dicos son|mi historial m[eé]dico incluye|tengo antecedentes de)\s+(.+)/iu,
    ],
    [
      "surgeries",
      /(?:me operaron|me han operado|tuve una (?:cirug[ií]a|operaci[oó]n)|mis cirug[ií]as|mis antecedentes quir[uú]rgicos)/iu,
    ],
    [
      "hospitalizations",
      /(?:estuve hospitalizad[oa]|fui hospitalizad[oa]|mis hospitalizaciones|me ingresaron)/iu,
    ],
    [
      "priorInjuries",
      /(?:mis lesiones anteriores|tuve una lesi[oó]n|me lesion[eé])/iu,
    ],
    ["priorTreatment", /(?:mi tratamiento anterior|he probado|prob[eé])/iu],
    [
      "imaging",
      /(?:me hicieron|tuve)\s+(?:una )?(?:resonancia|radiograf[ií]a|tomograf[ií]a|ecograf[ií]a)|mis estudios de imagen/iu,
    ],
    ["currentSymptoms", /(?:mis otros s[ií]ntomas|mis s[ií]ntomas actuales)/iu],
    ["ros", /(?:otros cambios en mi salud|mi revisi[oó]n por sistemas)/iu],
    [
      "tobacco",
      /(?:^fumo|^no fumo|nunca he fumado|dej[eé] de fumar|uso nicotina|uso cigarrillos electr[oó]nicos)/iu,
    ],
    ["alcohol", /(?:bebo alcohol|no bebo alcohol|mi consumo de alcohol)/iu],
    [
      "substances",
      /(?:uso cannabis|consumo cannabis|consumo marihuana|mi consumo de sustancias)/iu,
    ],
    [
      "occupation",
      /(?:trabajo como|mi ocupaci[oó]n es|mi trabajo es|estoy jubilad[oa])/iu,
    ],
    ["exercise", /(?:hago ejercicio|mi actividad f[ií]sica|mi ejercicio)/iu],
    ["sleep", /(?:^duermo|mi sue[nñ]o|tengo dificultad para dormir)/iu],
    ["nutrition", /(?:mi dieta|mi apetito|mis restricciones alimentarias)/iu],
    [
      "functionalLimitations",
      /(?:mis limitaciones diarias|tengo dificultad para (?:caminar|vestirme|conducir|trabajar))/iu,
    ],
    [
      "pcp",
      /(?:mi m[eé]dic[oa] de cabecera|mi m[eé]dic[oa] de atenci[oó]n primaria|mi profesional de atenci[oó]n primaria|no tengo m[eé]dic[oa] de cabecera)/iu,
    ],
    [
      "specialists",
      /(?:mi especialista|mis especialistas|me atiende un especialista)/iu,
    ],
    [
      "referral",
      /(?:me recomend[oó]|me remiti[oó]|me refiri[oó]|me enter[eé] por)/iu,
    ],
    [
      "additionalConcerns",
      /(?:tambi[eé]n quiero hablar|mis otras inquietudes|mi pregunta para el m[eé]dico)/iu,
    ],
    ["goals", /(?:quiero|mi objetivo es|me gustar[ií]a)\s+(.+)/iu],
  ],
  ru: [
    ["name", /(?:меня зовут|мо[её] имя)\s+(.+)/iu],
    [
      "dob",
      /(?:моя дата рождения|дата рождения|я родил(?:ся|ась))\s*[-—:]?\s*(.+)/iu,
    ],
    [
      "phone",
      /(?:мой (?:номер телефона|телефон)|мой номер)\s*[-—:]?\s*([+\d()\s-]{7,22})/iu,
    ],
    ["address", /(?:мой адрес|я живу по адресу)\s*[-—:]?\s*(.+)/iu],
    ["insurance", /(?:моя страхов(?:ая компания|ка))\s*[-—:]?\s*(.+)/iu],
    ["memberId", /(?:номер моего полиса|мой номер полиса)\s*[-—:]?\s*(.+)/iu],
    [
      "reason",
      /(?:я приш[её]л из-за|я пришла из-за|причина визита)\s*[-—:]?\s*(.+)/iu,
    ],
    ["onset", /(?:боль началась|это началось|началось)\s+(.+)/iu],
    ["medications", /(?:я принимаю|мои лекарства)\s*[-—:]?\s*(.+)/iu],
    ["allergies", /(?:у меня аллергия на|мои аллергии)\s*[-—:]?\s*(.+)/iu],
    [
      "history",
      /(?:мой медицинский анамнез|у меня в анамнезе|мои заболевания)\s*[-—:]?\s*(.+)/iu,
    ],
    [
      "surgeries",
      /(?:мне удалили|мне делали операцию|меня оперировали|мои операции|перенес[её]нные операции)/iu,
    ],
    [
      "hospitalizations",
      /(?:меня госпитализировали|я был[а]? госпитализирован[а]?|мои госпитализации|я лежал[а]? в больнице)/iu,
    ],
    [
      "priorInjuries",
      /(?:мои предыдущие травмы|раньше у меня была травма|я получил[а]? травму)/iu,
    ],
    [
      "priorTreatment",
      /(?:мо[её] предыдущее лечение|я пробовал[а]?|я проходил[а]? лечение)/iu,
    ],
    ["imaging", /(?:мне делали (?:мрт|кт|рентген|узи)|мои обследования)/iu],
    ["currentSymptoms", /(?:мои другие симптомы|мои текущие симптомы)/iu],
    [
      "ros",
      /(?:другие изменения в мо[её]м здоровье|обзор симптомов по системам)/iu,
    ],
    [
      "tobacco",
      /(?:я (?:не )?курю|я никогда не курил[а]?|я бросил[а]? курить|я использую никотин)/iu,
    ],
    [
      "alcohol",
      /(?:я (?:не )?(?:пью|употребляю) алкоголь|мо[её] употребление алкоголя)/iu,
    ],
    [
      "substances",
      /(?:я употребляю (?:каннабис|марихуану)|мо[её] употребление веществ)/iu,
    ],
    ["occupation", /(?:я работаю|моя профессия|моя работа|я на пенсии)/iu],
    ["exercise", /(?:я занимаюсь|моя физическая активность|мои упражнения)/iu],
    ["sleep", /(?:я сплю|мой сон|мне трудно спать)/iu],
    ["nutrition", /(?:моя диета|мой аппетит|мои ограничения в питании)/iu],
    [
      "functionalLimitations",
      /(?:мои повседневные ограничения|мне трудно (?:ходить|одеваться|водить|работать))/iu,
    ],
    [
      "pcp",
      /(?:мой лечащий врач|мой семейный врач|у меня нет лечащего врача)/iu,
    ],
    ["specialists", /(?:мой специалист|мои специалисты|я наблюдаюсь у)/iu],
    [
      "referral",
      /(?:меня направил[аи]?|я узнал[а]? о вас|мне рекомендовали)/iu,
    ],
    [
      "additionalConcerns",
      /(?:я также хочу обсудить|мои дополнительные вопросы|мой вопрос врачу)/iu,
    ],
    ["goals", /(?:я хочу|хочу|моя цель)\s*[-—:]?\s*(.+)/iu],
  ],
};

export function extractLocalized(
  text: string,
  context: FieldId | null | undefined,
  locale: Locale,
): Candidate[] {
  if (locale === "en") return extract(text, context);
  const mapped = new Map<FieldId, Candidate>();
  const put = (id: FieldId, value: string) => {
    const cleaned = value
      .trim()
      .replace(/[.,;]+$/, "")
      .trim();
    if (!cleaned) return;
    const old = mapped.get(id);
    mapped.set(id, {
      id,
      value:
        old && old.value !== cleaned ? `${old.value}; ${cleaned}` : cleaned,
      source: text,
    });
  };
  const clauses = text
    .replace(/\b(Dr|Dra)\./gu, "$1．")
    .split(
      /[;!?]|\.(?=\s|$)|\s+y\s+(?=(?:mi|mis|soy|tomo|quiero|estoy)\s)|\s+(?:и|а)\s+(?=(?:я|у|мой|моя|мои|мне)\s)/iu,
    )
    .map((value) => value.replace(/．/g, ".").trim())
    .filter(Boolean);
  const family =
    locale === "es"
      ? /(?:mi|mis)\s+(?:madre|padre|herman[oa]s?|hij[oa]s?|abuel[oa]s?|t[ií][oa]s?|padres)|antecedentes familiares|en mi familia/iu
      : /(?:у\s+)?(?:моей|моего|моих)\s+(?:матери|мамы|отца|папы|сестры|брата|детей|бабушки|дедушки)|у (?:отца|матери)|семейный анамнез|в моей семье/iu;
  const patientClauses: string[] = [];
  for (const clause of clauses) {
    if (family.test(clause)) {
      put("familyHistory", clause);
      continue;
    }
    patientClauses.push(clause);
    const deniedAllergy =
      locale === "es" &&
      /no (?:soy al[eé]rgic[oa] a|tengo alergia a)/iu.test(clause);
    for (const [id, pattern] of patterns[locale]) {
      if (id === "allergies" && deniedAllergy) continue;
      const match = clause.match(pattern);
      if (match) put(id, match[1] || clause);
    }
    if (deniedAllergy) put("allergies", clause);
    const email = clause.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu);
    if (email && !/(?:m[eé]dic|especialista|врач|специалист)/iu.test(clause))
      put("email", email[0]);
    if (
      locale === "es" &&
      /no (?:tomo|tengo) (?:medicamentos|medicaci[oó]n)/iu.test(clause)
    )
      put("medications", clause);
    if (locale === "es" && /no tengo alergias|sin alergias/iu.test(clause))
      put("allergies", clause);
    if (locale === "ru" && /не принимаю лекарств/iu.test(clause))
      put("medications", clause);
    if (locale === "ru" && /нет аллергии|нет аллергий/iu.test(clause))
      put("allergies", clause);
  }
  const patientText = patientClauses.join(". ");
  const pain =
    locale === "es" ? /dolor|duele|dolorid/iu : /болит|болят|боль|болезнен/iu;
  if (pain.test(patientText)) {
    const area = patientText.match(
      locale === "es"
        ? /rodilla|espalda|cuello|hombro|cadera|tobillo|mu[nñ]eca|cabeza|pierna|brazo|pie|mano/iu
        : /колен[а-я]*|спин[а-я]*|ше[яию]|плеч[а-я]*|бедр[а-я]*|голеностоп[а-я]*|запясть[а-я]*|голов[а-я]*|ног[а-я]*|рук[а-я]*|стоп[а-я]*/iu,
    );
    if (area) put("location", area[0]);
    const side = patientText.match(
      locale === "es"
        ? /izquierd[oa]|derech[oa]|amb[oa]s/iu
        : /лев[а-я]*|прав[а-я]*|об[еа]/iu,
    );
    if (side) put("side", side[0]);
    // Do not treat someone else's pain as the patient's complaint.
    if (
      patientClauses.some((c) =>
        locale === "es"
          ? /me duele/iu.test(c)
          : /у меня болит|у меня болят/iu.test(c),
      )
    ) {
      put(
        "reason",
        patientClauses.find((c) =>
          locale === "es"
            ? /me duele/iu.test(c)
            : /у меня болит|у меня болят/iu.test(c),
        )!,
      );
    }
    const severity = patientText.match(
      locale === "es"
        ? /(cero|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|10|[0-9])\s*(?:de|sobre|\/)\s*(?:diez|10)/iu
        : /(ноль|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять|10|[0-9])\s*(?:из|\/)\s*(?:десяти|10)/iu,
    );
    const numbers =
      locale === "es"
        ? [
            "cero",
            "uno",
            "dos",
            "tres",
            "cuatro",
            "cinco",
            "seis",
            "siete",
            "ocho",
            "nueve",
            "diez",
          ]
        : [
            "ноль",
            "один",
            "два",
            "три",
            "четыре",
            "пять",
            "шесть",
            "семь",
            "восемь",
            "девять",
            "десять",
          ];
    if (severity)
      put(
        "severity",
        numbers.includes(severity[1].toLowerCase())
          ? String(numbers.indexOf(severity[1].toLowerCase()))
          : severity[1],
      );
    const quality = patientText.match(
      locale === "es"
        ? /punzante|agudo|sordo|ardor|quemante|puls[aá]til|hormigueo/iu
        : /острая|острый|тупая|жгучая|пульсирующая|ноющая|колющая|покалывание/iu,
    );
    if (quality) put("quality", quality[0]);
  }
  for (const clause of patientClauses) {
    if (
      locale === "es"
        ? /lo empeora|empeora con|aumenta el dolor/iu.test(clause)
        : /усиливает боль|хуже при/iu.test(clause)
    )
      put("aggravating", clause);
    if (
      locale === "es"
        ? /ayuda|lo alivia|mejora con/iu.test(clause)
        : /помогает|облегчает|лучше при/iu.test(clause)
    )
      put("relieving", clause);
  }
  if (!mapped.size) return extract(text, context);
  return [...mapped.values()];
}
