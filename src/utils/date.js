// src/utils/date.js
import dayjs from "dayjs";
import jalaliday from "jalaliday";

dayjs.extend(jalaliday);

// این خط اضافه شده تا dayjs به صورت named export در دسترس باشه
export { dayjs };

export function todayJalaliYmd() {
  return dayjs().calendar("jalali").locale("fa").format("YYYY-MM-DD");
}

export function isJalaliYmd(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(str || ""));
}
