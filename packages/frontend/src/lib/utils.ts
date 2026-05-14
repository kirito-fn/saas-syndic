import { MONTHS } from "@syndic/shared";

export function formatMonthYear(month: number, year: number): string {
  return `${MONTHS[month - 1]} ${year}`;
}

export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} MAD`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function formatWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  const countryCode = cleaned.startsWith("0") ? "212" + cleaned.slice(1) : cleaned;
  return `https://wa.me/${countryCode}?text=${encodeURIComponent(message)}`;
}

export function formatMailtoLink(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function formatEmailReminderBody(
  residentName: string,
  month: number,
  year: number,
  amount: number,
  buildingName: string
): string {
  return `Bonjour ${residentName},

Nous vous rappelons que votre paiement de syndic pour le mois de ${MONTHS[month - 1]} ${year} d'un montant de ${amount.toLocaleString("fr-FR")} MAD n'a pas encore été effectué.

Merci de bien vouloir procéder au règlement dans les plus brefs délais.

Cordialement,
— Gestion ${buildingName}`;
}

export function formatEmailConfirmationBody(
  residentName: string,
  month: number,
  year: number,
  amount: number,
  buildingName: string
): string {
  return `Bonjour ${residentName},

Nous confirmons la réception de votre paiement de syndic pour le mois de ${MONTHS[month - 1]} ${year} d'un montant de ${amount.toLocaleString("fr-FR")} MAD.

Nous vous remercions pour votre règlement.

Cordialement,
— Gestion ${buildingName}`;
}

export function generateWhatsAppReminderMessage(
  residentName: string,
  month: number,
  year: number,
  buildingName: string
): string {
  const monthName = MONTHS[month - 1];
  return `السلام عليكم ${residentName}،

نذكركم أن واجب syndic لشهر ${monthName} ${year} لم يتم دفعه بعد.

الرجاء التكرم بدفع المستحقات في أقرب وقت ممكن.

شكرا جزيلا.
— ${buildingName}`;
}
