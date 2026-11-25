export const PERSIAN_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export const toEnglishDigits = (value = "") =>
  String(value)
    .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit));

export const currentPersianMonth = () => {
  try {
    const value = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      month: "numeric",
    }).format(new Date());
    const month = Number(toEnglishDigits(value));
    return month >= 1 && month <= 12 ? month : 1;
  } catch {
    return 1;
  }
};

export const getForecastMonths = () => {
  const start = currentPersianMonth();
  return Array.from({ length: 6 }, (_, index) => {
    const monthIndex = ((start + index - 1) % 12) + 1;
    return { key: `m${monthIndex}`, label: PERSIAN_MONTH_NAMES[monthIndex - 1] };
  });
};
