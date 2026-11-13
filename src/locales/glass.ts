import type { Locale } from "../i18n.ts";
const rows = `
Patient intake|Registro del paciente|Анкета пациента
Intake progress|Progreso del registro|Ход заполнения анкеты
Your words. Your control.|Sus palabras. Su control.|Ваши слова. Ваш выбор.
Intake questions|Preguntas del registro|Вопросы анкеты
A LITTLE ABOUT YOU|UN POCO SOBRE USTED|НЕМНОГО О ВАС
One step at a time.|Un paso a la vez.|Шаг за шагом.
Speak freely. We’ll help organize the details.|Hable libremente. Organizaremos los detalles.|Говорите свободно. Мы поможем упорядочить сведения.
answered|respondidas|отвечено
reviewed|revisadas|проверено
Complete|Completo|Заполнено
Incomplete|Por revisar|Требует проверки
Unanswered|Sin respuesta|Нет ответа
Needs confirmation|Requiere confirmación|Требует подтверждения
Required|Obligatorio|Обязательно
Optional|Opcional|Необязательно
Review & share|Revisar y compartir|Проверить и отправить
You review everything before sharing.|Usted revisa todo antes de compartir.|Вы проверяете всё до отправки.
Private intake|Registro privado|Личная анкета
Demonstration · fictional information only|Demostración · solo información ficticia|Демонстрация · только вымышленные сведения
Let’s start with|Comencemos con|Начнём с
your story.|su historia.|вашей истории.
Tell us what brings you in. There’s no wrong place to begin.|Cuéntenos qué le trae aquí. Puede empezar por donde quiera.|Расскажите, что привело вас к нам. Начните с того, что вам удобно.
Here to listen|Aquí para escuchar|Готовы выслушать
Speak or type your answers|Diga o escriba sus respuestas|Отвечайте голосом или письменно
YOUR VOICE, AT YOUR PACE|SU VOZ, A SU RITMO|ВАШ ГОЛОС, В ВАШЕМ ТЕМПЕ
Recording|Grabando|Идёт запись
Starting microphone|Activando micrófono|Включаем микрофон
Paused|En pausa|Пауза
Microphone off|Micrófono apagado|Микрофон выключен
Pause recording|Pausar grabación|Приостановить запись
Start recording|Iniciar grabación|Начать запись
We’re listening. Take your time.|Le escuchamos. Tómese su tiempo.|Мы слушаем. Не торопитесь.
A conversation, not a questionnaire.|Una conversación, no un cuestionario.|Разговор вместо опросника.
Describe your concern, medications, or history in your own words.|Describa su preocupación, medicamentos o antecedentes con sus propias palabras.|Опишите своими словами жалобы, лекарства или анамнез.
Resume recording|Reanudar grabación|Возобновить запись
or|o|или
I’d rather type|Prefiero escribir|Предпочитаю писать
Microphone starts only with your permission. Audio is not saved by this app.|El micrófono se activa solo con su permiso. Esta aplicación no guarda audio.|Микрофон включается только с вашего разрешения. Приложение не сохраняет аудио.
Your live transcript|Su transcripción en vivo|Текущая расшифровка
Original words|Palabras originales|Исходные слова
Your words will appear here as you speak. You can also type below.|Sus palabras aparecerán aquí al hablar. También puede escribir abajo.|Ваши слова появятся здесь во время речи. Вы также можете писать ниже.
Read the full transcript|Leer transcripción completa|Прочитать полную расшифровку
LET’S FILL IN THE DETAILS|COMPLETEMOS LOS DETALLES|УТОЧНИМ ПОДРОБНОСТИ
You told us|Usted nos dijo|Вы рассказали
Edit answer|Editar respuesta|Изменить ответ
Confirm uncertainty|Confirmar incertidumbre|Подтвердить неуверенность
Confirm answer|Confirmar respuesta|Подтвердить ответ
Edit this answer|Edite esta respuesta|Измените этот ответ
Save correction|Guardar corrección|Сохранить исправление
Add answer|Añadir respuesta|Добавить ответ
Which answer should we keep?|¿Qué respuesta conservamos?|Какой ответ сохранить?
Previous answer|Respuesta anterior|Прежний ответ
New answer|Respuesta nueva|Новый ответ
Keep previous answer|Conservar respuesta anterior|Оставить прежний ответ
Use new answer|Usar respuesta nueva|Использовать новый ответ
A FEW HELPFUL FOLLOW-UPS|ALGUNAS PREGUNTAS ÚTILES|НЕСКОЛЬКО УТОЧНЕНИЙ
Help us understand a little better.|Ayúdenos a entender mejor.|Помогите нам лучше понять вас.
Pause intake|Pausar registro|Приостановить заполнение
Review my intake|Revisar mi registro|Проверить мою анкету
Your story,|Su historia,|Ваша история,
ready to review.|lista para revisar.|готова к проверке.
Check your answers. You can change or add anything before sharing.|Revise sus respuestas. Puede cambiar o añadir lo que necesite antes de compartir.|Проверьте ответы. До отправки можно всё изменить или дополнить.
Intake summaries|Resúmenes del registro|Сводки анкеты
Patient summary|Resumen del paciente|Сводка для пациента
Doctor summary|Resumen para el médico|Сводка для врача
IN YOUR OWN WORDS|CON SUS PROPIAS PALABRAS|ВАШИМИ СЛОВАМИ
Here’s what you shared.|Esto es lo que compartió.|Вот что вы рассказали.
This is a summary of your answers, not a diagnosis.|Este es un resumen de sus respuestas, no un diagnóstico.|Это сводка ваших ответов, а не диагноз.
Patient confirmed|Confirmado por el paciente|Подтверждено пациентом
Patient reported · needs review|Informado por el paciente · por revisar|Со слов пациента · требуется проверка
You haven’t shared details for this section yet.|Aún no ha compartido detalles en esta sección.|Вы ещё не заполнили этот раздел.
Add details|Añadir detalles|Добавить сведения
Source: patient reported|Fuente: informado por el paciente|Источник: со слов пациента
No connected medical records have been imported or verified. Patient confirmation does not mean clinician or record verification.|No se han importado ni verificado registros médicos conectados. La confirmación del paciente no equivale a verificación clínica o documental.|Подключённые медицинские записи не импортировались и не проверялись. Подтверждение пациентом не означает проверку врачом или по документам.
Resolve different answers before sharing.|Resuelva las respuestas diferentes antes de compartir.|Уточните противоречивые ответы до отправки.
You decide what happens next.|Usted decide el siguiente paso.|Вы решаете, что будет дальше.
Do you need immediate staff help?|¿Necesita ayuda inmediata del personal?|Вам нужна немедленная помощь персонала?
Yes, I need help|Sí, necesito ayuda|Да, мне нужна помощь
Please tell clinic staff now. If this is a medical emergency, contact local emergency services. This app is not monitored for emergencies.|Avise al personal ahora. En una emergencia médica, contacte los servicios de emergencia locales. Esta aplicación no se supervisa para emergencias.|Сообщите персоналу сейчас. При неотложном состоянии обратитесь в местную экстренную службу. Приложение не отслеживается для экстренной помощи.
Still needed|Aún falta|Ещё нужно
I reviewed my answers and summaries. They are accurate to the best of my knowledge, including anything marked unknown.|Revisé mis respuestas y resúmenes. Son correctos según mi conocimiento, incluido lo marcado como desconocido.|Я проверил(а) ответы и сводки. Насколько мне известно, они верны, включая сведения, помеченные как неизвестные.
I agree to share these confirmed answers and both summaries with the configured clinic connector. Audio is not included.|Acepto compartir estas respuestas confirmadas y ambos resúmenes con el conector configurado de la clínica. No se incluye audio.|Я согласен(на) отправить подтверждённые ответы и обе сводки через настроенное подключение клиники. Аудио не отправляется.
Destination|Destino|Получатель
Not connected|Sin conexión|Не подключено
A clinic invitation is required for secure delivery.|Se requiere una invitación de la clínica para un envío seguro.|Для защищённой отправки требуется приглашение клиники.
EHR delivery is not configured. Nothing is sent or saved to a medical record.|El envío al sistema clínico no está configurado. Nada se envía ni se guarda en una historia clínica.|Отправка в медицинскую систему не настроена. Ничего не отправляется и не сохраняется в медицинскую карту.
Sending confirmed intake…|Enviando registro confirmado…|Отправляем подтверждённую анкету…
Submit confirmed intake|Enviar registro confirmado|Отправить подтверждённую анкету
Received by the clinic connector|Recibido por el conector de la clínica|Получено подключённой системой клиники
Receipt|Comprobante|Квитанция
The connector has acknowledged receipt. This does not confirm a clinician has reviewed it.|El conector confirmó la recepción. Esto no confirma que un profesional lo haya revisado.|Подключённая система подтвердила получение. Это не означает, что врач уже проверил сведения.
Please keep this page open while we check the delivery receipt.|Mantenga esta página abierta mientras verificamos el comprobante.|Не закрывайте страницу, пока мы проверяем подтверждение доставки.
Delivery could not be confirmed.|No se pudo confirmar la entrega.|Не удалось подтвердить доставку.
Delivery unavailable.|Envío no disponible.|Отправка недоступна.
Your intake is still here. Retry sends the same submission ID to help prevent duplicates.|Su registro sigue aquí. El reintento usa el mismo identificador para evitar duplicados.|Анкета осталась здесь. Повторная отправка использует тот же идентификатор для предотвращения дубликатов.
Ask the clinic for a configured intake invitation. Your answers have not been sent.|Pida a la clínica una invitación configurada. Sus respuestas no se enviaron.|Попросите у клиники настроенное приглашение. Ваши ответы не отправлены.
Retry delivery|Reintentar envío|Повторить отправку
Back to my answers|Volver a mis respuestas|Вернуться к ответам
Private by design. Answers stay in this tab until you confirm sharing. Inactive sessions clear after 10 minutes.|Privacidad desde el diseño. Las respuestas permanecen en esta pestaña hasta que confirme compartirlas. La sesión se borra tras 10 minutos de inactividad.|Ответы остаются в этой вкладке до согласия на отправку. После 10 минут бездействия сеанс очищается.
Save encrypted draft|Guardar borrador cifrado|Сохранить зашифрованный черновик
Resume from draft|Reanudar desde borrador|Продолжить из черновика
This application supports intake and clinical review. It does not diagnose conditions or replace medical care.|Esta aplicación ayuda al registro y la revisión clínica. No diagnostica ni sustituye la atención médica.|Приложение помогает собрать сведения и подготовиться к приёму. Оно не ставит диагнозы и не заменяет медицинскую помощь.
Close dialog|Cerrar diálogo|Закрыть окно
Your microphone, your choice.|Su micrófono, su elección.|Ваш микрофон, ваш выбор.
With your consent, your browser’s speech service will process your microphone audio to create a live transcript in the selected language. The provider may process audio on its servers.|Con su consentimiento, el servicio de voz del navegador procesará el audio para transcribirlo en el idioma seleccionado. El proveedor puede procesarlo en sus servidores.|С вашего согласия служба речи браузера обработает звук микрофона для расшифровки на выбранном языке. Поставщик может обрабатывать звук на своих серверах.
This app keeps the transcript and extracted answers in this tab. It does not save audio recordings. Only confirmed answers and summaries are sent when you separately consent to sharing.|La aplicación conserva la transcripción y las respuestas en esta pestaña. No guarda grabaciones. Solo se envían las respuestas y resúmenes confirmados cuando acepta compartirlos por separado.|Расшифровка и ответы остаются в этой вкладке. Аудиозаписи не сохраняются. Только подтверждённые ответы и сводки отправляются после отдельного согласия.
Use the clinic-approved browser and intake invitation.|Use el navegador aprobado y la invitación de la clínica.|Используйте одобренный клиникой браузер и приглашение.
Demonstration mode: use fictional information only.|Modo demostración: use solo información ficticia.|Демонстрационный режим: используйте только вымышленные сведения.
I consent — start microphone|Acepto: activar micrófono|Согласен(на) — включить микрофон
Take a moment. We’ll be here.|Tómese un momento. Aquí estaremos.|Сделайте перерыв. Мы подождём.
Recording is off. You can resume in this tab. For later, save a passphrase-protected draft before leaving; otherwise this tab clears after 10 minutes of inactivity.|La grabación está apagada. Puede continuar en esta pestaña. Para más tarde, guarde un borrador con contraseña antes de salir; si no, la pestaña se borra tras 10 minutos de inactividad.|Запись выключена. Можно продолжить в этой вкладке. Чтобы вернуться позже, сохраните защищённый паролем черновик; иначе вкладка очистится после 10 минут бездействия.
Resume intake|Reanudar registro|Продолжить заполнение
Keep your place, privately.|Guarde su progreso en privado.|Сохраните прогресс конфиденциально.
Welcome back.|Bienvenido de nuevo.|С возвращением.
Use a passphrase of at least 12 characters. The draft is encrypted on this device. Keep the file and passphrase safe; neither is sent to the clinic.|Use una contraseña de al menos 12 caracteres. El borrador se cifra en este dispositivo. Proteja el archivo y la contraseña; no se envían a la clínica.|Используйте пароль не короче 12 символов. Черновик шифруется на устройстве. Берегите файл и пароль; в клинику они не отправляются.
Draft passphrase|Contraseña del borrador|Пароль черновика
Working…|Procesando…|Обрабатываем…
Download encrypted draft|Descargar borrador cifrado|Скачать зашифрованный черновик
Restore encrypted draft|Restaurar borrador cifrado|Восстановить зашифрованный черновик
Start with what matters most to you. You can answer in any order.|Empiece por lo más importante para usted. Puede responder en cualquier orden.|Начните с самого важного для вас. Можно отвечать в любом порядке.
Different answers need your confirmation. Your previous answer has been kept.|Las respuestas diferentes requieren confirmación. Conservamos su respuesta anterior.|Противоречивые ответы требуют подтверждения. Прежний ответ сохранён.
Your words were added to the matching fields. Please review them.|Sus palabras se añadieron a los campos correspondientes. Revíselas.|Ваши слова добавлены в соответствующие поля. Проверьте их.
Your words are in the transcript. Choose a question to add the detail.|Sus palabras están en la transcripción. Elija una pregunta para añadir el detalle.|Ваши слова есть в расшифровке. Выберите вопрос, чтобы добавить сведения.
Voice is unavailable in this browser. You can type every answer.|La voz no está disponible en este navegador. Puede escribir todas las respuestas.|Голосовой ввод недоступен в этом браузере. Все ответы можно написать.
Recording stopped. Check microphone permission, try again, or type your answer.|La grabación se detuvo. Revise el permiso del micrófono, reintente o escriba.|Запись остановилась. Проверьте разрешение микрофона, повторите попытку или напишите ответ.
Your private session was cleared after 10 minutes of inactivity.|Su sesión privada se borró tras 10 minutos de inactividad.|Сеанс очищен после 10 минут бездействия.
Encrypted draft saved. Keep your passphrase separately; the clinic cannot recover it.|Borrador cifrado guardado. Guarde la contraseña por separado; la clínica no puede recuperarla.|Зашифрованный черновик сохранён. Храните пароль отдельно; клиника не сможет его восстановить.
Draft restored. Review the answers and grant microphone consent again if you want to speak.|Borrador restaurado. Revise las respuestas y vuelva a dar permiso si quiere hablar.|Черновик восстановлен. Проверьте ответы и снова разрешите микрофон, если хотите говорить.
Could not open or save the draft. Check the file and use a passphrase of at least 12 characters.|No se pudo abrir o guardar el borrador. Revise el archivo y use una contraseña de al menos 12 caracteres.|Не удалось открыть или сохранить черновик. Проверьте файл и используйте пароль не короче 12 символов.
Reason for your visit|Motivo de su consulta|Причина визита
Symptoms & timeline|Síntomas y evolución|Симптомы и хронология
Medical & surgical history|Antecedentes médicos y quirúrgicos|Медицинский и хирургический анамнез
Medications & allergies|Medicamentos y alergias|Лекарства и аллергии
Daily life & social history|Vida diaria y antecedentes sociales|Образ жизни и социальный анамнез
Care team & other concerns|Equipo médico y otras preocupaciones|Медицинская команда и другие вопросы
What is the main concern you would like help with today?|¿Cuál es la preocupación principal con la que le gustaría recibir ayuda hoy?|С какой основной проблемой вы хотели бы получить помощь сегодня?
When did this concern begin, and has it changed since then?|¿Cuándo comenzó esta preocupación y ha cambiado desde entonces?|Когда началась эта проблема и как она изменилась с тех пор?
How does this affect your daily activities or work?|¿Cómo afecta esto a sus actividades diarias o trabajo?|Как это влияет на ваши повседневные дела или работу?
This answer sounds uncertain. Please clarify what you know, or confirm that you are unsure.|Esta respuesta parece incierta. Aclare lo que sabe o confirme que no está seguro.|Этот ответ звучит неуверенно. Уточните, что знаете, или подтвердите, что не уверены.
`;
export const glassCatalog: Record<string, { es: string; ru: string }> = {};
for (const row of rows.trim().split("\n")) {
  const [en, es, ru] = row.split("|");
  glassCatalog[en] = { es, ru };
}
export function glassText(
  text: string,
  locale: Locale,
  fallback: (text: string, locale: Locale) => string,
) {
  return locale === "en"
    ? text
    : glassCatalog[text]?.[locale] || fallback(text, locale);
}
