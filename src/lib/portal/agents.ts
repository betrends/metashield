// Placeholder support-agent roster. There's no staff/admin backend yet to
// manage real agents or their live caseloads, so a case gets assigned one
// of these fixed identities at creation time — enough to give clients a
// named point of contact instead of an anonymous "Case Team".
// TODO before launch: replace with real staff accounts and real
// assignment logic (e.g. based on current caseload).

export type Agent = {
  name: string;
  phone: string;
  email: string;
};

export const agentRoster: Agent[] = [
  { name: "Adaeze Okonkwo", phone: "+2348010000001", email: "adaeze@example.com" },
  { name: "Tunde Bakare", phone: "+2348010000002", email: "tunde@example.com" },
  { name: "Chiamaka Eze", phone: "+2348010000003", email: "chiamaka@example.com" },
];

export function pickAgent(): Agent {
  return agentRoster[Math.floor(Math.random() * agentRoster.length)];
}
