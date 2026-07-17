type PasteSourceFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function PasteSourceForm({ action }: PasteSourceFormProps) {
  return (
    <form action={action} className="source-form">
      <h2>Paste research text</h2>
      <label htmlFor="paste-title">Source title</label>
      <input id="paste-title" maxLength={255} name="title" required />
      <label htmlFor="text">Text</label>
      <textarea id="text" maxLength={100000} name="text" required rows={10} />
      <p>Up to 100,000 characters. Quotes stay linked to this source.</p>
      <button type="submit">Add pasted source</button>
    </form>
  );
}
