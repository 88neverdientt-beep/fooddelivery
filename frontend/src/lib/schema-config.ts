import { z } from 'zod';

// Configure before any application schema is constructed. The runtime parser keeps
// validation semantics without probing new Function under the staging script CSP.
z.config({ jitless: true });
