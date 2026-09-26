import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SHEET_API_URL, GOOGLE_SHEET_ID } from '../config';
import SafeHtml from './SafeHtml';
import {
  Lock,
  LogOut,
  CalendarDays,
  Megaphone,
  Mail,
  Table2,
  LayoutDashboard,
  Bold,
  Italic,
  Link2,
  List,
  Heading2,
  ExternalLink,
  Send
} from 'lucide-react';

// sessionStorage, not one of the site's tr_sc_* localStorage keys — an admin
// session should not silently outlive the browser tab, unlike a visitor's
// signed-up-ids or theme preference.
const ADMIN_TOKEN_KEY = 'tr_sc_admin_token';

type AdminTab = 'overview' | 'events' | 'announcements' | 'newsletter' | 'compose' | 'sheet';

interface AdminBaseResult {
  ok: boolean;
  error?: string;
}

interface AdminRow {
  row: number;
  fields: Record<string, string | number | boolean>;
}

interface ListRowsResult extends AdminBaseResult {
  rows?: AdminRow[];
}

interface SaveRowResult extends AdminBaseResult {
  row?: number;
}

interface PublishCounts {
  events: number;
  eventPhotos: number;
  announcements: number;
  labLogs: number;
  resources: number;
}

interface PublishResult extends AdminBaseResult {
  needsConfirmation?: boolean;
  problems?: string[];
  counts?: PublishCounts;
}

interface SenderGroupInfo {
  id: string;
  title: string;
}

interface SenderSegmentInfo {
  id: string;
  name: string;
}

interface SenderInfoResult extends AdminBaseResult {
  groups?: SenderGroupInfo[];
  segments?: SenderSegmentInfo[];
  fromName?: string;
  replyTo?: string;
}

interface CreateCampaignResult extends AdminBaseResult {
  campaignId?: string;
  status?: string;
  recipientCount?: number | null;
}

interface CampaignStat {
  id: string;
  subject: string;
  sentTime: string;
  recipientCount: number;
  sentCount: number;
  opens: number;
  clicks: number;
  bounces: number;
}

interface ListCampaignsResult extends AdminBaseResult {
  campaigns?: CampaignStat[];
}

interface ZohoStatusResult extends AdminBaseResult {
  connected?: boolean;
  fromAddress?: string;
}

async function callAdmin<T extends AdminBaseResult>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  if (!SHEET_API_URL) {
    return { ok: false, error: 'The site is not connected to a spreadsheet yet.' } as T;
  }
  try {
    const response = await fetch(SHEET_API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload })
    });
    if (!response.ok) {
      return { ok: false, error: `The server returned HTTP ${response.status}.` } as T;
    }
    return JSON.parse(await response.text()) as T;
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' } as T;
  }
}

const inputBase =
  'w-full p-2.5 rounded-xl text-sm border-2 border-[#1F3A42]/12 bg-white focus:outline-none focus:border-[#6CC24A] transition-colors';

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'checkbox' | 'select';
  options?: string[];
  helper?: string;
  span?: 'full';
}

const EVENT_FIELDS: FieldConfig[] = [
  { key: 'Title', label: 'Title', type: 'text' },
  { key: 'Date', label: 'Date', type: 'text', helper: 'e.g. September 26, 2026' },
  { key: 'Time', label: 'Time', type: 'text', helper: 'e.g. 4:00 – 5:30 PM' },
  { key: 'Location', label: 'Location', type: 'text' },
  { key: 'Spots Total', label: 'Spots Total', type: 'number' },
  { key: 'Spots Taken', label: 'Spots Taken', type: 'number', helper: 'Usually automatic — signups update this.' },
  { key: 'Description', label: 'Description', type: 'textarea', span: 'full' },
  { key: 'Image URL', label: 'Image URL', type: 'text', span: 'full' },
  {
    key: 'Photos',
    label: 'Photos (a URL, or paste embed HTML — advanced)',
    type: 'textarea',
    span: 'full'
  },
  { key: 'Show on Site', label: 'Show on Site', type: 'checkbox' },
  { key: 'Done', label: 'Done (hides from Upcoming, keeps its photo album)', type: 'checkbox' }
];

const ANNOUNCEMENT_FIELDS: FieldConfig[] = [
  { key: 'Title', label: 'Title', type: 'text' },
  { key: 'Date', label: 'Date', type: 'text' },
  { key: 'Category', label: 'Category', type: 'select', options: ['general', 'expansion', 'toolkit', 'volunteer'] },
  { key: 'Content', label: 'Content', type: 'textarea', span: 'full', helper: 'Supports $math$ and basic HTML.' },
  { key: 'Show on Site', label: 'Show on Site', type: 'checkbox' }
];

function FieldInput({
  field,
  value,
  onChange
}: {
  field: FieldConfig;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
}) {
  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm font-medium text-[#1F3A42]">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded accent-[#6CC24A]"
        />
        {field.label}
      </label>
    );
  }
  if (field.type === 'select') {
    return (
      <select className={inputBase} value={String(value || '')} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {(field.options || []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        className={`${inputBase} min-h-[100px]`}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      className={inputBase}
      value={value === '' || value === undefined || value === null ? '' : String(value)}
      onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
    />
  );
}

/**
 * Generic list + editor for a sheet tab, shared by Events and Announcements
 * so the two only differ by which fields they show and which actions they
 * call. Both write into the same `_Published` snapshot, so "Publish to
 * Website" lives here too rather than in a separate tab.
 */
function ContentPanel({
  title,
  listAction,
  saveAction,
  fields,
  titleKey,
  subtitleKey,
  adminCall: call
}: {
  title: string;
  listAction: string;
  saveAction: string;
  fields: FieldConfig[];
  titleKey: string;
  subtitleKey?: string;
  adminCall: <T extends AdminBaseResult>(action: string, payload?: Record<string, unknown>) => Promise<T>;
}) {
  const [rows, setRows] = useState<AdminRow[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [editing, setEditing] = useState<AdminRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [publishState, setPublishState] = useState<'idle' | 'confirming' | 'publishing' | 'done'>('idle');
  const [publishMessage, setPublishMessage] = useState('');
  const [publishProblems, setPublishProblems] = useState<string[]>([]);

  const load = useCallback(async () => {
    const result = await call<ListRowsResult>(listAction);
    if (result.ok) {
      setRows(result.rows || []);
      setLoadError('');
    } else {
      setLoadError(result.error || 'Could not load.');
    }
  }, [call, listAction]);

  useEffect(() => {
    void load();
  }, [load]);

  const startNew = () => {
    const blank: Record<string, string | number | boolean> = {};
    fields.forEach((f) => {
      blank[f.key] = f.type === 'checkbox' ? false : '';
    });
    setEditing({ row: 0, fields: blank });
    setSaveError('');
  };

  const startEdit = (row: AdminRow) => {
    setEditing({ row: row.row, fields: { ...row.fields } });
    setSaveError('');
  };

  const handleFieldChange = (key: string, value: string | number | boolean) => {
    setEditing((prev) => (prev ? { ...prev, fields: { ...prev.fields, [key]: value } } : prev));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setSaveError('');
    const result = await call<SaveRowResult>(saveAction, { row: editing.row, fields: editing.fields });
    setSaving(false);
    if (result.ok) {
      setEditing(null);
      void load();
    } else {
      setSaveError(result.error || 'Could not save.');
    }
  };

  const handlePublish = async (skipProblems: boolean) => {
    setPublishState('publishing');
    const result = await call<PublishResult>('adminPublish', { skipProblems });
    if (!result.ok && result.needsConfirmation) {
      setPublishProblems(result.problems || []);
      setPublishState('confirming');
      return;
    }
    if (!result.ok) {
      setPublishMessage(result.error || 'Could not publish.');
      setPublishState('idle');
      return;
    }
    const c = result.counts;
    setPublishMessage(
      c
        ? `Published — ${c.events} event(s), ${c.announcements} announcement(s), ${c.labLogs} lab log(s), ${c.resources} resource(s) live now.`
        : 'Published.'
    );
    setPublishState('done');
    setPublishProblems([]);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h2 className="font-display font-bold text-2xl text-[#1F3A42] mr-auto">{title}</h2>
        <button
          type="button"
          onClick={startNew}
          className="px-5 py-2.5 rounded-full font-display font-bold text-sm bg-white hover:bg-[#1F3A42]/5 text-[#1F3A42] border-2 border-[#1F3A42]/12 transition-colors cursor-pointer"
        >
          + New
        </button>
        <button
          type="button"
          onClick={() => handlePublish(false)}
          disabled={publishState === 'publishing'}
          className="px-5 py-2.5 rounded-full font-display font-bold text-sm bg-[#1F3A42] text-white disabled:opacity-60 cursor-pointer"
        >
          {publishState === 'publishing' ? 'Publishing…' : '🚀 Publish to Website'}
        </button>
      </div>

      {publishState === 'confirming' && (
        <div className="rounded-[24px] border-2 border-[#F2C94C] bg-[#FFF8E1] p-4 mb-6">
          <p className="font-bold text-sm mb-2">Found {publishProblems.length} problem(s):</p>
          <ul className="text-xs text-[#4B6169] list-disc pl-5 mb-3 space-y-1">
            {publishProblems.slice(0, 10).map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handlePublish(true)}
              className="px-4 py-2 rounded-full font-display font-bold text-xs bg-[#1F3A42] text-white cursor-pointer"
            >
              Publish anyway
            </button>
            <button
              type="button"
              onClick={() => setPublishState('idle')}
              className="px-4 py-2 rounded-full font-display font-bold text-xs bg-white border-2 border-[#1F3A42]/12 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {publishMessage && publishState !== 'confirming' && (
        <div
          className={`rounded-[24px] border-2 p-4 mb-6 text-sm font-medium ${
            publishState === 'done'
              ? 'border-[#6CC24A] bg-[#E4F5DA] text-[#2E7D46]'
              : 'border-[#E4574B] bg-[#FDECEA] text-[#E4574B]'
          }`}
        >
          {publishMessage}
        </div>
      )}

      {editing && (
        <form
          onSubmit={handleSave}
          className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {fields.map((field) => (
            <div key={field.key} className={field.span === 'full' ? 'sm:col-span-2' : ''}>
              {field.type !== 'checkbox' && (
                <label className="block text-xs font-bold uppercase tracking-wide text-[#4B6169] mb-1">
                  {field.label}
                </label>
              )}
              <FieldInput
                field={field}
                value={editing.fields[field.key]}
                onChange={(v) => handleFieldChange(field.key, v)}
              />
              {field.helper && <p className="text-xs text-[#4B6169] mt-1">{field.helper}</p>}
            </div>
          ))}
          <div className="sm:col-span-2 flex items-center gap-3 pt-2 flex-wrap">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-full font-display font-bold text-sm bg-[#6CC24A] text-[#14351F] disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Saving…' : editing.row ? 'Save Changes' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-6 py-3 rounded-full font-display font-bold text-sm bg-white border-2 border-[#1F3A42]/12 text-[#1F3A42] cursor-pointer"
            >
              Cancel
            </button>
            {saveError && <span className="text-sm text-[#E4574B] font-medium">{saveError}</span>}
          </div>
        </form>
      )}

      <div className="space-y-3">
        {rows === null && !loadError && <p className="text-sm text-[#4B6169]">Loading…</p>}
        {loadError && <p className="text-sm text-[#E4574B] font-medium">{loadError}</p>}
        {rows && rows.length === 0 && <p className="text-sm text-[#4B6169]">Nothing here yet.</p>}
        {rows?.map((r) => (
          <div
            key={r.row}
            className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-4 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <p className="font-display font-bold text-sm truncate">{String(r.fields[titleKey] || '(untitled)')}</p>
              {subtitleKey && <p className="text-xs text-[#4B6169] truncate">{String(r.fields[subtitleKey] || '')}</p>}
            </div>
            <button
              type="button"
              onClick={() => startEdit(r)}
              className="shrink-0 px-4 py-2 rounded-full font-display font-bold text-xs bg-white hover:bg-[#1F3A42]/5 text-[#1F3A42] border-2 border-[#1F3A42]/12 cursor-pointer"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolbarButton({ onClick, icon: Icon, label }: { onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="px-3 py-1.5 rounded-full text-xs font-bold border-2 border-[#1F3A42]/12 bg-white hover:bg-[#1F3A42]/5 text-[#1F3A42] flex items-center gap-1.5 cursor-pointer"
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

/**
 * Two-step send, deliberately: adminCreateCampaign only ever creates a
 * Sender.net DRAFT, and the real, un-undoable send is a second call the
 * admin has to explicitly confirm by typing SEND. See CLAUDE.md's Newsletter
 * section for why campaigns should target a Confirmed segment, not a raw
 * group — the tip banner below says the same thing inline.
 */
function NewsletterPanel({
  adminCall: call
}: {
  adminCall: <T extends AdminBaseResult>(action: string, payload?: Record<string, unknown>) => Promise<T>;
}) {
  const [info, setInfo] = useState<SenderInfoResult | null>(null);
  const [infoError, setInfoError] = useState('');
  const [campaigns, setCampaigns] = useState<CampaignStat[] | null>(null);
  const [campaignsError, setCampaignsError] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState('');
  const [stage, setStage] = useState<'compose' | 'draft' | 'sent'>('compose');
  const [draft, setDraft] = useState<CreateCampaignResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    void (async () => {
      const result = await call<SenderInfoResult>('adminSenderInfo');
      if (result.ok) setInfo(result);
      else setInfoError(result.error || 'Could not load Sender.net info.');
    })();
  }, [call]);

  useEffect(() => {
    void (async () => {
      const result = await call<ListCampaignsResult>('adminListCampaigns');
      if (result.ok) setCampaigns(result.campaigns || []);
      else setCampaignsError(result.error || 'Could not load past campaigns.');
    })();
  }, [call]);

  const wrapSelection = (before: string, after: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || 'text';
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + before.length;
      el.selectionEnd = start + before.length + selected.length;
    });
  };

  const toggleGroup = (id: string) => {
    setSelectedGroupIds((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));
  };

  const handleCreateDraft = async () => {
    setCreateError('');
    if (!subject.trim()) return setCreateError('Add a subject line first.');
    if (!content.trim()) return setCreateError('Write something first.');
    if (!selectedGroupIds.length && !selectedSegmentId) return setCreateError('Pick at least one group or a segment.');

    setCreating(true);
    const result = await call<CreateCampaignResult>('adminCreateCampaign', {
      subject: subject.trim(),
      content,
      groupIds: selectedGroupIds,
      segmentIds: selectedSegmentId ? [selectedSegmentId] : []
    });
    setCreating(false);
    if (result.ok) {
      setDraft(result);
      setStage('draft');
      setConfirmText('');
    } else {
      setCreateError(result.error || 'Could not create the draft.');
    }
  };

  const handleSend = async () => {
    if (!draft?.campaignId) return;
    setSending(true);
    setSendError('');
    const result = await call<AdminBaseResult>('adminSendCampaign', { campaignId: draft.campaignId });
    setSending(false);
    if (result.ok) {
      setStage('sent');
    } else {
      setSendError(result.error || 'Could not send.');
    }
  };

  const rawGroupSelectedNoSegment = selectedGroupIds.length > 0 && !selectedSegmentId;

  if (infoError) {
    return (
      <div>
        <h2 className="font-display font-bold text-2xl text-[#1F3A42] mb-4">Newsletter</h2>
        <p className="text-sm text-[#E4574B] font-medium">{infoError}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-[#1F3A42] mb-6">Newsletter</h2>

      {stage === 'compose' && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#4B6169] mb-2">Recent Campaigns</p>
            {campaigns === null && !campaignsError && <p className="text-sm text-[#4B6169]">Loading…</p>}
            {campaignsError && <p className="text-sm text-[#E4574B] font-medium">{campaignsError}</p>}
            {campaigns && campaigns.length === 0 && (
              <p className="text-sm text-[#4B6169]">No sent campaigns yet.</p>
            )}
            {campaigns && campaigns.length > 0 && (
              <div className="rounded-[24px] border-2 border-[#1F3A42]/8 bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-wide text-[#4B6169] border-b-2 border-[#1F3A42]/8">
                      <th className="px-4 py-2.5">Subject</th>
                      <th className="px-4 py-2.5">Sent</th>
                      <th className="px-4 py-2.5 text-right">Recipients</th>
                      <th className="px-4 py-2.5 text-right">Opens</th>
                      <th className="px-4 py-2.5 text-right">Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id} className="border-b border-[#1F3A42]/8 last:border-0">
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap max-w-xs truncate">{c.subject}</td>
                        <td className="px-4 py-2.5 text-[#4B6169] whitespace-nowrap">{c.sentTime}</td>
                        <td className="px-4 py-2.5 text-right">{c.sentCount || c.recipientCount}</td>
                        <td className="px-4 py-2.5 text-right">{c.opens}</td>
                        <td className="px-4 py-2.5 text-right">{c.clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-[#4B6169] mb-1">Subject</label>
            <input className={inputBase} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-[#4B6169] mb-2">Content</label>
            <div className="flex flex-wrap gap-2 mb-2">
              <ToolbarButton onClick={() => wrapSelection('<strong>', '</strong>')} icon={Bold} label="Bold" />
              <ToolbarButton onClick={() => wrapSelection('<em>', '</em>')} icon={Italic} label="Italic" />
              <ToolbarButton onClick={() => wrapSelection('<h3>', '</h3>')} icon={Heading2} label="Heading" />
              <ToolbarButton
                onClick={() => wrapSelection('<a href="https://">', '</a>')}
                icon={Link2}
                label="Link"
              />
              <ToolbarButton
                onClick={() => wrapSelection('<ul>\n  <li>', '</li>\n</ul>')}
                icon={List}
                label="List"
              />
            </div>
            <textarea
              ref={textareaRef}
              className={`${inputBase} min-h-[220px] font-mono text-xs`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the email as HTML — select text and use a toolbar button to format it."
            />
          </div>

          {content.trim() && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#4B6169] mb-2">Preview</p>
              <div className="rounded-[24px] border-2 border-[#1F3A42]/8 bg-white p-6 trsc-newsletter-wrapper">
                <SafeHtml content={content} />
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#4B6169] mb-2">Groups</p>
              <div className="space-y-2">
                {info?.groups?.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedGroupIds.includes(g.id)}
                      onChange={() => toggleGroup(g.id)}
                      className="w-4 h-4 accent-[#6CC24A]"
                    />
                    {g.title}
                  </label>
                ))}
                {!info?.groups?.length && <p className="text-xs text-[#4B6169]">Loading…</p>}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#4B6169] mb-2">
                Segment (optional, narrows further)
              </p>
              <select className={inputBase} value={selectedSegmentId} onChange={(e) => setSelectedSegmentId(e.target.value)}>
                <option value="">None</option>
                {info?.segments?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {rawGroupSelectedNoSegment && (
            <div className="rounded-[24px] border-2 border-[#F2C94C] bg-[#FFF8E1] p-4 text-sm text-[#4B6169]">
              ⚠️ A Group alone reaches everyone ever added to it, including people who never
              confirmed their subscription. Add a Segment (e.g. a "Group AND Confirmed" segment
              built in Sender.net) to reach only confirmed subscribers.
            </div>
          )}

          {createError && <p className="text-sm text-[#E4574B] font-medium">{createError}</p>}

          <button
            type="button"
            onClick={handleCreateDraft}
            disabled={creating}
            className="px-6 py-3 rounded-full font-display font-bold text-sm bg-[#1F3A42] text-white disabled:opacity-60 cursor-pointer"
          >
            {creating ? 'Preparing…' : 'Review Draft'}
          </button>
        </div>
      )}

      {stage === 'draft' && draft && (
        <div className="rounded-[28px] border-2 border-[#F2C94C] bg-[#FFF8E1] p-6">
          <p className="font-display font-bold text-lg mb-2">Ready to send?</p>
          <p className="text-sm mb-1">
            <strong>Subject:</strong> {subject}
          </p>
          {draft.recipientCount != null && (
            <p className="text-sm mb-3">
              <strong>Estimated recipients:</strong> {draft.recipientCount}
            </p>
          )}
          <p className="text-sm text-[#4B6169] mb-4">
            This sends a real email to real subscribers right now — it cannot be undone. Type SEND
            to confirm.
          </p>
          <input
            className={`${inputBase} mb-4 max-w-xs`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type SEND"
          />
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSend}
              disabled={confirmText !== 'SEND' || sending}
              className="px-6 py-3 rounded-full font-display font-bold text-sm bg-[#E4574B] text-white disabled:opacity-40 cursor-pointer"
            >
              {sending ? 'Sending…' : 'Send Now'}
            </button>
            <button
              type="button"
              onClick={() => {
                setStage('compose');
                setDraft(null);
                setConfirmText('');
              }}
              className="px-6 py-3 rounded-full font-display font-bold text-sm bg-white border-2 border-[#1F3A42]/12 cursor-pointer"
            >
              Back to editing
            </button>
          </div>
          {sendError && <p className="text-sm text-[#E4574B] font-medium mt-3">{sendError}</p>}
        </div>
      )}

      {stage === 'sent' && (
        <div className="rounded-[28px] border-2 border-[#6CC24A] bg-[#E4F5DA] p-6 text-[#2E7D46]">
          <p className="font-display font-bold text-lg mb-1">🚀 Sent!</p>
          <p className="text-sm">Sender.net is delivering it now.</p>
          <button
            type="button"
            onClick={() => {
              setStage('compose');
              setSubject('');
              setContent('');
              setDraft(null);
              setConfirmText('');
              setSelectedGroupIds([]);
              setSelectedSegmentId('');
            }}
            className="mt-4 px-5 py-2.5 rounded-full font-display font-bold text-sm bg-white border-2 border-[#1F3A42]/12 cursor-pointer"
          >
            Write another
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * One-off private email via Zoho Mail — Sender.net can't send these (mass
 * campaigns only), so this is the Newsletter tab's counterpart for a single
 * recipient. No two-step confirm like the newsletter send: one targeted
 * email is a normal, low-blast-radius action, not a mass send.
 */
function ComposePanel({
  adminCall: call
}: {
  adminCall: <T extends AdminBaseResult>(action: string, payload?: Record<string, unknown>) => Promise<T>;
}) {
  const [status, setStatus] = useState<ZohoStatusResult | null>(null);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    void (async () => {
      const result = await call<ZohoStatusResult>('adminZohoStatus');
      setStatus(result);
    })();
  }, [call]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError('');
    if (!to.trim() || !subject.trim() || !content.trim()) {
      setSendError('Fill in a recipient, subject, and message.');
      return;
    }
    setSending(true);
    const result = await call<AdminBaseResult>('adminSendEmail', {
      to: to.trim(),
      cc: cc.trim(),
      subject: subject.trim(),
      content,
      mailFormat: 'plaintext'
    });
    setSending(false);
    if (result.ok) {
      setSent(true);
    } else {
      setSendError(result.error || 'Could not send.');
    }
  };

  const reset = () => {
    setTo('');
    setCc('');
    setSubject('');
    setContent('');
    setSent(false);
    setSendError('');
  };

  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-[#1F3A42] mb-1">Compose</h2>

      {!status && <p className="text-sm text-[#4B6169]">Loading…</p>}

      {status && !status.ok && <p className="text-sm text-[#E4574B] font-medium">{status.error}</p>}

      {status?.ok && !status.connected && (
        <div className="rounded-[24px] border-2 border-[#F2C94C] bg-[#FFF8E1] p-6 text-sm text-[#4B6169] max-w-xl">
          Zoho Mail isn't connected yet. Ask an operator to run 🐢 Website ▸ 🔌 Zoho Mail ▸ 🔗
          Connect Zoho Mail — see <code>apps-script/SETUP.md</code> for the one-time setup.
        </div>
      )}

      {status?.ok && status.connected && (
        <>
          <p className="text-sm text-[#4B6169] mb-6 max-w-xl">
            Sends one email as <strong>{status.fromAddress}</strong> via Zoho Mail — for a single
            person, not a mass campaign (use the Newsletter tab for that).
          </p>

          {sent ? (
            <div className="rounded-[28px] border-2 border-[#6CC24A] bg-[#E4F5DA] p-6 text-[#2E7D46] max-w-xl">
              <p className="font-display font-bold text-lg mb-1">Sent!</p>
              <button
                type="button"
                onClick={reset}
                className="mt-3 px-5 py-2.5 rounded-full font-display font-bold text-sm bg-white border-2 border-[#1F3A42]/12 cursor-pointer"
              >
                Write another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[#4B6169] mb-1">To</label>
                <input type="email" className={inputBase} value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[#4B6169] mb-1">
                  Cc (optional)
                </label>
                <input type="email" className={inputBase} value={cc} onChange={(e) => setCc(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[#4B6169] mb-1">
                  Subject
                </label>
                <input className={inputBase} value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-[#4B6169] mb-1">
                  Message
                </label>
                <textarea
                  className={`${inputBase} min-h-[200px]`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              {sendError && <p className="text-sm text-[#E4574B] font-medium">{sendError}</p>}
              <button
                type="submit"
                disabled={sending}
                className="px-6 py-3 rounded-full font-display font-bold text-sm bg-[#1F3A42] text-white disabled:opacity-60 cursor-pointer"
              >
                {sending ? 'Sending…' : 'Send Email'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Google blocks its Sheets editor (and its sign-in page) from being framed
 * by another origin — a clickjacking protection with no opt-out — so an
 * embedded iframe here would just render blank. "Open in Google Sheets" is
 * the honest version of "linked together": one click to the exact same
 * spreadsheet the Admin Hub writes into, in a new tab.
 */
function BackupSheetPanel() {
  return (
    <div>
      <h2 className="font-display font-bold text-2xl text-[#1F3A42] mb-2">Backup Sheet</h2>
      <p className="text-sm text-[#4B6169] mb-6 max-w-2xl">
        The Admin Hub writes into this same spreadsheet, so it's always the ground truth if
        anything here ever looks wrong — and it's still where Lab Log, Resources, Signups and
        Members live for now. Google doesn't allow its Sheets editor to be embedded on another
        site, so this opens it directly instead.
      </p>
      <a
        href={`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/edit`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-6 hover:border-[#6CC24A] transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-[#E4F5DA] text-[#2E7D46] flex items-center justify-center shrink-0">
          <Table2 className="w-5 h-5" />
        </div>
        <div>
          <p className="font-display font-bold text-base mb-0.5">Open the Google Sheet</p>
          <p className="text-sm text-[#4B6169] flex items-center gap-1.5">
            Turtle Rock Science Club — Website Content <ExternalLink className="w-3.5 h-3.5" />
          </p>
        </div>
      </a>
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  title,
  desc,
  onClick
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-6 hover:border-[#6CC24A] transition-colors cursor-pointer"
    >
      <div className="w-10 h-10 rounded-full bg-[#E4F5DA] text-[#2E7D46] flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <p className="font-display font-bold text-base mb-1">{title}</p>
      <p className="text-sm text-[#4B6169]">{desc}</p>
    </button>
  );
}

function OverviewPanel({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-6">
        <h2 className="font-display font-bold text-2xl mb-2">Welcome to the Admin Hub</h2>
        <p className="text-sm text-[#4B6169] leading-relaxed">
          Edit events and announcements here, then publish them live — same "nothing goes live
          until you Publish" rule as the Sheet always had. Compose and send the newsletter without
          leaving this page. The Sheet stays the source of truth underneath: everything here writes
          straight into it, and the Backup Sheet tab links straight to it for anything not covered
          here yet.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewCard icon={CalendarDays} title="Events" desc="Add, edit, publish." onClick={() => onNavigate('events')} />
        <OverviewCard
          icon={Megaphone}
          title="Announcements"
          desc="Add, edit, publish."
          onClick={() => onNavigate('announcements')}
        />
        <OverviewCard
          icon={Mail}
          title="Newsletter"
          desc="Mass emails via Sender.net."
          onClick={() => onNavigate('newsletter')}
        />
        <OverviewCard
          icon={Send}
          title="Compose"
          desc="A single email via Zoho Mail."
          onClick={() => onNavigate('compose')}
        />
      </div>
    </div>
  );
}

function LoginGate({
  password,
  setPassword,
  onSubmit,
  loading,
  error
}: {
  password: string;
  setPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF7EC] text-[#1F3A42] font-sans p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-[28px] border-2 border-[#1F3A42]/8 bg-white p-8 shadow-2xl">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#E4F5DA] text-[#2E7D46] mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="font-display font-bold text-xl text-center mb-1">Admin Hub</h1>
        <p className="text-sm text-[#4B6169] text-center mb-6">Turtle Rock Science Club — staff only.</p>
        <label className="block text-xs font-bold uppercase tracking-wide text-[#4B6169] mb-1">Password</label>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${inputBase} mb-4`}
        />
        {error && <p className="text-sm text-[#E4574B] font-medium mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full px-6 py-3 rounded-full font-display font-bold text-sm bg-[#6CC24A] text-[#14351F] disabled:opacity-60 cursor-pointer"
        >
          {loading ? 'Checking…' : 'Log In'}
        </button>
      </form>
    </div>
  );
}

const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'newsletter', label: 'Newsletter', icon: Mail },
  { id: 'compose', label: 'Compose', icon: Send },
  { id: 'sheet', label: 'Backup Sheet', icon: Table2 }
];

export default function AdminHub({ onExit }: { onExit: () => void }) {
  const [adminToken, setAdminToken] = useState<string>(() => {
    try {
      return sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [tab, setTab] = useState<AdminTab>('overview');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');
    const result = await callAdmin<AdminBaseResult & { token?: string }>('adminLogin', { password });
    setLoggingIn(false);
    if (result.ok && result.token) {
      setAdminToken(result.token);
      try {
        sessionStorage.setItem(ADMIN_TOKEN_KEY, result.token);
      } catch {
        /* ignore */
      }
      setPassword('');
    } else {
      setLoginError(result.error || 'Login failed.');
    }
  };

  const forgetSession = () => {
    setAdminToken('');
    try {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {
      /* ignore */
    }
  };

  const handleLogout = () => {
    void callAdmin('adminLogout', { adminToken });
    forgetSession();
  };

  // Every admin-scoped call goes through here so an expired session (12h,
  // or invalidated by someone else logging in) bounces back to the login
  // gate instead of quietly failing.
  const adminCall = useCallback(
    function adminCallImpl<T extends AdminBaseResult>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
      return callAdmin<T>(action, { ...payload, adminToken }).then((result) => {
        if (!result.ok && /session expired/i.test(result.error || '')) {
          forgetSession();
        }
        return result;
      });
    },
    [adminToken]
  );

  if (!adminToken) {
    return <LoginGate password={password} setPassword={setPassword} onSubmit={handleLogin} loading={loggingIn} error={loginError} />;
  }

  return (
    <div className="min-h-screen bg-[#FBF7EC] text-[#1F3A42] font-sans">
      <div className="border-b-2 border-[#1F3A42]/8 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4 flex-wrap">
          <p className="font-display font-bold text-lg mr-auto">🐢 Admin Hub</p>
          <button
            type="button"
            onClick={onExit}
            className="px-4 py-2 rounded-full font-display font-bold text-xs bg-white hover:bg-[#1F3A42]/5 text-[#1F3A42] border-2 border-[#1F3A42]/12 cursor-pointer"
          >
            View Site
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-full font-display font-bold text-xs bg-white hover:bg-[#1F3A42]/5 text-[#1F3A42] border-2 border-[#1F3A42]/12 flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-3 flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-2 rounded-full text-[13px] font-sans font-extrabold border-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                tab === t.id
                  ? 'bg-[#E4F5DA] text-[#2E7D46] border-transparent'
                  : 'text-[#4B6169] border-transparent hover:bg-[#1F3A42]/5'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {tab === 'overview' && <OverviewPanel onNavigate={setTab} />}
        {tab === 'events' && (
          <ContentPanel
            title="Events"
            listAction="adminListEvents"
            saveAction="adminSaveEvent"
            fields={EVENT_FIELDS}
            titleKey="Title"
            subtitleKey="Date"
            adminCall={adminCall}
          />
        )}
        {tab === 'announcements' && (
          <ContentPanel
            title="Announcements"
            listAction="adminListAnnouncements"
            saveAction="adminSaveAnnouncement"
            fields={ANNOUNCEMENT_FIELDS}
            titleKey="Title"
            subtitleKey="Date"
            adminCall={adminCall}
          />
        )}
        {tab === 'newsletter' && <NewsletterPanel adminCall={adminCall} />}
        {tab === 'compose' && <ComposePanel adminCall={adminCall} />}
        {tab === 'sheet' && <BackupSheetPanel />}
      </div>
    </div>
  );
}
