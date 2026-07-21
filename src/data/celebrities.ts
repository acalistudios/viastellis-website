/**
 * Celebrity birth data — feature #11 ("vibe with a celebrity").
 *
 * All entries use publicly documented birth dates and birthplaces.
 * Birth times are intentionally omitted (time_unknown: true → noon used,
 * Chandra-lagna reading) so we never assert a rising sign we can't source.
 * Coordinates are city-level.
 */

import type { BirthData } from '@/types'

export interface Celebrity extends BirthData {
  emoji: string
  wikidataId?: string
}

export const CELEBRITIES: Celebrity[] = [
  { emoji: '🎤', name: 'Taylor Swift',     date: '1989-12-13', city: 'Reading',      country: 'United States', latitude: 40.3357,  longitude: -75.9269,  timezone: 'America/New_York',     time: '12:00', time_unknown: true },
  { emoji: '👑', name: 'Beyoncé',          date: '1981-09-04', city: 'Houston',      country: 'United States', latitude: 29.7604,  longitude: -95.3698,  timezone: 'America/Chicago',      time: '12:00', time_unknown: true },
  { emoji: '🇺🇸', name: 'Barack Obama',     date: '1961-08-04', city: 'Honolulu',     country: 'United States', latitude: 21.3069,  longitude: -157.8583, timezone: 'Pacific/Honolulu',     time: '12:00', time_unknown: true },
  { emoji: '📺', name: 'Oprah Winfrey',    date: '1954-01-29', city: 'Kosciusko',    country: 'United States', latitude: 33.0579,  longitude: -89.5876,  timezone: 'America/Chicago',      time: '12:00', time_unknown: true },
  { emoji: '🚀', name: 'Elon Musk',        date: '1971-06-28', city: 'Pretoria',     country: 'South Africa',  latitude: -25.7479, longitude: 28.2293,   timezone: 'Africa/Johannesburg',  time: '12:00', time_unknown: true },
  { emoji: '🧠', name: 'Albert Einstein',  date: '1879-03-14', city: 'Ulm',          country: 'Germany',       latitude: 48.4011,  longitude: 9.9876,    timezone: 'Europe/Berlin',        time: '12:00', time_unknown: true },
  { emoji: '🎬', name: 'Leonardo DiCaprio',date: '1974-11-11', city: 'Los Angeles',  country: 'United States', latitude: 34.0522,  longitude: -118.2437, timezone: 'America/Los_Angeles',  time: '12:00', time_unknown: true },
  { emoji: '💎', name: 'Rihanna',          date: '1988-02-20', city: 'Saint Michael',country: 'Barbados',      latitude: 13.1132,  longitude: -59.5988,  timezone: 'America/Barbados',     time: '12:00', time_unknown: true },
  { emoji: '🕶️', name: 'Keanu Reeves',     date: '1964-09-02', city: 'Beirut',       country: 'Lebanon',       latitude: 33.8938,  longitude: 35.5018,   timezone: 'Asia/Beirut',          time: '12:00', time_unknown: true },
  { emoji: '🎭', name: 'Lady Gaga',        date: '1986-03-28', city: 'New York',     country: 'United States', latitude: 40.7128,  longitude: -74.006,   timezone: 'America/New_York',     time: '12:00', time_unknown: true },
  { emoji: '✈️', name: 'Tom Cruise',       date: '1962-07-03', city: 'Syracuse',     country: 'United States', latitude: 43.0481,  longitude: -76.1474,  timezone: 'America/New_York',     time: '12:00', time_unknown: true },
  { emoji: '🌹', name: 'Scarlett Johansson',date: '1984-11-22',city: 'New York',     country: 'United States', latitude: 40.7128,  longitude: -74.006,   timezone: 'America/New_York',     time: '12:00', time_unknown: true },
  { emoji: '⚽', name: 'Cristiano Ronaldo', date: '1985-02-05', city: 'Funchal',      country: 'Portugal',      latitude: 32.6669,  longitude: -16.9241,  timezone: 'Atlantic/Madeira',     time: '12:00', time_unknown: true },
  { emoji: '🎾', name: 'Serena Williams',  date: '1981-09-26', city: 'Saginaw',      country: 'United States', latitude: 43.4195,  longitude: -83.9508,  timezone: 'America/Detroit',      time: '12:00', time_unknown: true },
  { emoji: '🪄', name: 'Emma Watson',      date: '1990-04-15', city: 'Paris',        country: 'France',        latitude: 48.8566,  longitude: 2.3522,    timezone: 'Europe/Paris',         time: '12:00', time_unknown: true },
  { emoji: '🪨', name: 'Dwayne Johnson',   date: '1972-05-02', city: 'Hayward',      country: 'United States', latitude: 37.6688,  longitude: -122.0808, timezone: 'America/Los_Angeles',  time: '12:00', time_unknown: true },
  { emoji: '🩵', name: 'Billie Eilish',    date: '2001-12-18', city: 'Los Angeles',  country: 'United States', latitude: 34.0522,  longitude: -118.2437, timezone: 'America/Los_Angeles',  time: '12:00', time_unknown: true },
  { emoji: '🎸', name: 'Harry Styles',     date: '1994-02-01', city: 'Redditch',     country: 'United Kingdom',latitude: 52.3069,  longitude: -1.9461,   timezone: 'Europe/London',        time: '12:00', time_unknown: true },
  { emoji: '✨', name: 'Zendaya',            date: '1996-09-01', city: 'Oakland',      country: 'United States', latitude: 37.8,     longitude: -122.25,   timezone: 'America/Los_Angeles', time: '12:00', time_unknown: true, wikidataId: 'Q189489' },
  { emoji: '🎶', name: 'Ariana Grande',     date: '1993-06-26', city: 'Boca Raton',   country: 'United States', latitude: 26.3686,  longitude: -80.1,     timezone: 'America/New_York',    time: '12:00', time_unknown: true, wikidataId: 'Q151892' },
  { emoji: '🌟', name: 'Selena Gomez',      date: '1992-07-22', city: 'Grand Prairie',country: 'United States', latitude: 32.7153,  longitude: -97.0169,  timezone: 'America/Chicago',     time: '12:00', time_unknown: true, wikidataId: 'Q83287' },
  { emoji: '🎤', name: 'Miley Cyrus',       date: '1992-11-23', city: 'Nashville',    country: 'United States', latitude: 36.1622,  longitude: -86.7744,  timezone: 'America/Chicago',     time: '12:00', time_unknown: true, wikidataId: 'Q4235' },
  { emoji: '🎙️', name: 'Adele',              date: '1988-05-05', city: 'Tottenham',    country: 'United Kingdom',latitude: 51.5975,  longitude: -0.0681,   timezone: 'Europe/London',       time: '12:00', time_unknown: true, wikidataId: 'Q23215' },
  { emoji: '💃', name: 'Shakira',           date: '1977-02-02', city: 'Barranquilla', country: 'Colombia',      latitude: 10.9833,  longitude: -74.8019,  timezone: 'America/Bogota',      time: '12:00', time_unknown: true, wikidataId: 'Q34424' },
  { emoji: '💫', name: 'Jennifer Lopez',    date: '1969-07-24', city: 'The Bronx',    country: 'United States', latitude: 40.8467,  longitude: -73.8733,  timezone: 'America/New_York',    time: '12:00', time_unknown: true, wikidataId: 'Q40715' },
  { emoji: '🎥', name: 'Angelina Jolie',    date: '1975-06-04', city: 'Los Angeles',  country: 'United States', latitude: 34.0522,  longitude: -118.2437, timezone: 'America/Los_Angeles', time: '12:00', time_unknown: true, wikidataId: 'Q13909' },
  { emoji: '🎬', name: 'Brad Pitt',         date: '1963-12-18', city: 'Shawnee',      country: 'United States', latitude: 35.3425,  longitude: -96.9339,  timezone: 'America/Chicago',     time: '12:00', time_unknown: true, wikidataId: 'Q35332' },
  { emoji: '😄', name: 'Ryan Reynolds',     date: '1976-10-23', city: 'Vancouver',    country: 'Canada',        latitude: 49.2608,  longitude: -123.1139, timezone: 'America/Vancouver',   time: '12:00', time_unknown: true, wikidataId: 'Q192682' },
  { emoji: '🦸', name: 'Robert Downey Jr.', date: '1965-04-04', city: 'Manhattan',    country: 'United States', latitude: 40.7283,  longitude: -73.9942,  timezone: 'America/New_York',    time: '12:00', time_unknown: true, wikidataId: 'Q165219' },
  { emoji: '🔨', name: 'Chris Hemsworth',   date: '1983-08-11', city: 'Melbourne',    country: 'Australia',     latitude: -37.8142, longitude: 144.9631,  timezone: 'Australia/Melbourne', time: '12:00', time_unknown: true, wikidataId: 'Q54314' },
  { emoji: '🧸', name: 'Natalie Portman',   date: '1981-06-09', city: 'Jerusalem',    country: 'Israel',        latitude: 31.7819,  longitude: 35.2194,   timezone: 'Asia/Jerusalem',      time: '12:00', time_unknown: true, wikidataId: 'Q37876' },
  { emoji: '🎞️', name: 'George Clooney',    date: '1961-05-06', city: 'Lexington',    country: 'United States', latitude: 38.0497,  longitude: -84.4586,  timezone: 'America/New_York',    time: '12:00', time_unknown: true, wikidataId: 'Q23844' },
  { emoji: '🎭', name: 'Will Smith',        date: '1968-09-25', city: 'Philadelphia', country: 'United States', latitude: 39.9528,  longitude: -75.1636,  timezone: 'America/New_York',    time: '12:00', time_unknown: true, wikidataId: 'Q40096' },
  { emoji: '🎧', name: 'Drake',             date: '1986-10-24', city: 'Toronto',      country: 'Canada',        latitude: 43.6703,  longitude: -79.3867,  timezone: 'America/Toronto',     time: '12:00', time_unknown: true, wikidataId: 'Q33240' },
  { emoji: '🏀', name: 'LeBron James',      date: '1984-12-30', city: 'Akron',        country: 'United States', latitude: 41.0731,  longitude: -81.5178,  timezone: 'America/New_York',    time: '12:00', time_unknown: true, wikidataId: 'Q36159' },
  { emoji: '🕺', name: 'Michael Jackson',   date: '1958-08-29', city: 'Gary',         country: 'United States', latitude: 41.5808,  longitude: -87.3456,  timezone: 'America/Chicago',     time: '12:00', time_unknown: true, wikidataId: 'Q2831' },
]
