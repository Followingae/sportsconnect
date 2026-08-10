/**
 * BRD §22 — mandatory fields must validate before an event can be submitted.
 *
 * Lives outside the server-actions file so both the client builder and the
 * server can call it: a `"use server"` module may only export async functions.
 */

export type SubmissionProblem = { step: number; label: string; message: string };

export type ValidatableEvent = {
  name?: string | null;
  sport_id?: string | null;
  format_id?: string | null;
  description?: string | null;
  starts_at?: string | null;
  venue_name?: string | null;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  banner_url?: string | null;
  cancellation_policy?: string | null;
  config?: { max_participants?: number | null; max_teams?: number | null } | null;
  registration_model?: string | null;
};

export function validateForSubmission(event: ValidatableEvent): SubmissionProblem[] {
  const problems: SubmissionProblem[] = [];
  const add = (step: number, label: string, message: string) =>
    problems.push({ step, label, message });

  if (!event.name || event.name.trim().length < 3)
    add(1, "Basic information", "The event needs a name.");
  if (!event.description || event.description.trim().length < 20)
    add(1, "Basic information", "Add a description of at least 20 characters.");
  if (!event.sport_id) add(2, "Sport & format", "Pick a sport.");
  if (!event.format_id) add(2, "Sport & format", "Pick a format.");
  if (!event.starts_at) add(3, "Date & venue", "Set the start date and time.");
  if (!event.venue_name) add(3, "Date & venue", "Name the venue.");
  if (!event.registration_opens_at)
    add(4, "Registration settings", "Set when registration opens.");
  if (!event.registration_closes_at)
    add(4, "Registration settings", "Set when registration closes.");

  const capacity =
    event.registration_model === "team"
      ? event.config?.max_teams
      : event.config?.max_participants;

  if (!capacity)
    add(
      5,
      "Participant requirements",
      event.registration_model === "team"
        ? "Set the maximum number of teams."
        : "Set the maximum number of participants."
    );

  if (!event.cancellation_policy)
    add(7, "Rules & information", "A cancellation and refund policy is required.");
  if (!event.banner_url) add(8, "Images & media", "Upload a banner image.");

  return problems;
}
