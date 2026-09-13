import type { Councillor } from '../lib/types';

const FIND_MEMBER = 'https://barnsleymbc.moderngov.co.uk/mgFindMember.aspx';

type Props = {
  councillors: Councillor[];
  findMemberUrl?: string;
};

function partyTint(party: string): string {
  const p = party.toLowerCase();
  if (p.includes('labour')) return '#8b3a3a';
  if (p.includes('liberal')) return '#c4782a';
  if (p.includes('reform')) return '#1d4ed8';
  return '#5c6b73';
}

export function CouncillorsPanel({ councillors, findMemberUrl = FIND_MEMBER }: Props) {
  const east = councillors.filter((c) => c.wardSlug === 'east');
  const west = councillors.filter((c) => c.wardSlug === 'west');

  return (
    <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
      <h2 className="font-display text-xl text-moss">Councillors</h2>
      <p className="mt-1 text-sm text-ink/60">
        Public Barnsley councillor contacts · not a marked register · no electors.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <WardList title="Penistone East" members={east} tint="#b45309" findMemberUrl={findMemberUrl} />
        <WardList title="Penistone West" members={west} tint="#1d4ed8" findMemberUrl={findMemberUrl} />
      </div>
    </section>
  );
}

function WardList({
  title,
  members,
  tint,
  findMemberUrl
}: {
  title: string;
  members: Councillor[];
  tint: string;
  findMemberUrl: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold" style={{ color: tint }}>
        {title}
      </h3>
      {members.length === 0 ? (
        <p className="mt-2 text-sm text-ink/55">No public contacts loaded.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {members.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-stone/40 px-3 py-2">
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: partyTint(c.party) }}>
                {c.party}
                {' · '}
                {c.ward}
              </p>
              {c.note && <p className="mt-1 text-xs text-ink/55">{c.note}</p>}
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {c.email ? (
                  <a className="font-semibold text-moss underline decoration-line underline-offset-2" href={`mailto:${c.email}`}>
                    {c.email}
                  </a>
                ) : (
                  <span className="text-ink/55">Email TBD</span>
                )}
                {c.phone && (
                  <a className="font-semibold text-moss underline decoration-line underline-offset-2" href={`tel:${c.phone.replace(/\s+/g, '')}`}>
                    {c.phone}
                  </a>
                )}
              </p>
              <a
                className="mt-1 inline-block text-sm font-semibold text-moss underline decoration-line underline-offset-2"
                href={c.profileUrl || findMemberUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open council profile
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
