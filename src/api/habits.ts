/* The single seam between the UI and "the server".
   v0 (now):     localStorage implementation, with simulated latency and
                 simulated failures (Settings → Network simulation).
   Later (class): implement the same HabitApi interface in src/api/habits.http.ts
                 using fetch(), then swap exactly this one line. No component
                 below this seam changes. */

import type { HabitApi } from './types';
import { createLocalApi } from './local';

export const habitApi: HabitApi = createLocalApi();
