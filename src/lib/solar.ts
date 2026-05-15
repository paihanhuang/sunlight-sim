export type SunPosition = {
  azimuthDeg: number;
  elevationDeg: number;
  isDaylight: boolean;
};

export type SolarDay = {
  sunrise: string | null;
  solarNoon: string;
  sunset: string | null;
};

const rad = Math.PI / 180;
const deg = 180 / Math.PI;

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function normalizeSignedDegrees(value: number): number {
  const normalized = normalizeDegrees(value);
  return normalized > 180 ? normalized - 360 : normalized;
}

function toJulianDay(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

export function getSunPosition(date: Date, latitudeDeg: number, longitudeDeg: number): SunPosition {
  const julianDay = toJulianDay(date);
  const daysSinceJ2000 = julianDay - 2_451_545.0;

  const meanLongitude = normalizeDegrees(280.46 + 0.9856474 * daysSinceJ2000);
  const meanAnomaly = normalizeDegrees(357.528 + 0.9856003 * daysSinceJ2000);
  const eclipticLongitude =
    meanLongitude +
    1.915 * Math.sin(meanAnomaly * rad) +
    0.02 * Math.sin(2 * meanAnomaly * rad);
  const obliquity = 23.439 - 0.0000004 * daysSinceJ2000;

  const rightAscension = normalizeDegrees(
    Math.atan2(
      Math.cos(obliquity * rad) * Math.sin(eclipticLongitude * rad),
      Math.cos(eclipticLongitude * rad)
    ) * deg
  );
  const declination = Math.asin(
    Math.sin(obliquity * rad) * Math.sin(eclipticLongitude * rad)
  );

  const centuries = (julianDay - 2_451_545.0) / 36_525;
  const greenwichSiderealTime = normalizeDegrees(
    280.46061837 +
      360.98564736629 * (julianDay - 2_451_545.0) +
      0.000387933 * centuries * centuries -
      (centuries * centuries * centuries) / 38_710_000
  );

  const localSiderealTime = normalizeDegrees(greenwichSiderealTime + longitudeDeg);
  const hourAngle = normalizeSignedDegrees(localSiderealTime - rightAscension) * rad;
  const latitude = latitudeDeg * rad;

  const elevation = Math.asin(
    Math.sin(latitude) * Math.sin(declination) +
      Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle)
  );

  const azimuth = Math.atan2(
    -Math.sin(hourAngle),
    Math.tan(declination) * Math.cos(latitude) -
      Math.sin(latitude) * Math.cos(hourAngle)
  );

  return {
    azimuthDeg: normalizeDegrees(azimuth * deg),
    elevationDeg: elevation * deg,
    isDaylight: elevation > 0,
  };
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000);
}

function solarDeclinationAndEquationOfTime(date: Date) {
  const gamma = (2 * Math.PI) / 365 * (dayOfYear(date) - 1);
  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const declination =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  return { declination, equationOfTime };
}

function minutesToClock(minutes: number): string {
  const total = Math.round(((minutes % 1440) + 1440) % 1440);
  const hour = Math.floor(total / 60).toString().padStart(2, "0");
  const minute = (total % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

export function getSolarDay(date: Date, latitudeDeg: number, longitudeDeg: number): SolarDay {
  const { declination, equationOfTime } = solarDeclinationAndEquationOfTime(date);
  const latitude = latitudeDeg * rad;
  const zenith = 90.833 * rad;
  const hourAngleArg =
    (Math.cos(zenith) / (Math.cos(latitude) * Math.cos(declination))) -
    Math.tan(latitude) * Math.tan(declination);

  const solarNoonMinutes =
    720 - 4 * longitudeDeg - equationOfTime - date.getTimezoneOffset();

  if (hourAngleArg > 1) {
    return {
      sunrise: null,
      solarNoon: minutesToClock(solarNoonMinutes),
      sunset: null,
    };
  }

  if (hourAngleArg < -1) {
    return {
      sunrise: "00:00",
      solarNoon: minutesToClock(solarNoonMinutes),
      sunset: "23:59",
    };
  }

  const hourAngle = Math.acos(hourAngleArg) * deg;
  const sunrise = solarNoonMinutes - hourAngle * 4;
  const sunset = solarNoonMinutes + hourAngle * 4;

  return {
    sunrise: minutesToClock(sunrise),
    solarNoon: minutesToClock(solarNoonMinutes),
    sunset: minutesToClock(sunset),
  };
}

export function combineLocalDateAndTime(dateValue: string, timeValue: string): Date {
  return new Date(`${dateValue}T${timeValue}:00`);
}
