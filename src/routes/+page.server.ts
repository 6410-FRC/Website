import { redirect } from '@sveltejs/kit';

/** The bare address goes to the English home page. */
export const load = () => redirect(302, '/en/');
