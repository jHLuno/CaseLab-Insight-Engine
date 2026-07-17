type UploadSourceFormProps = {
  action: (formData: FormData) => void | Promise<void>;
};

export function UploadSourceForm({ action }: UploadSourceFormProps) {
  return (
    <form action={action} className="source-form">
      <h2>Upload a text file</h2>
      <label htmlFor="upload-title">Source title <span>(optional)</span></label>
      <input id="upload-title" maxLength={255} name="title" />
      <label htmlFor="file">UTF-8 .txt file</label>
      <input accept=".txt,text/plain" id="file" name="file" required type="file" />
      <p>Up to 1 MiB. The original file remains private to this project.</p>
      <button type="submit">Upload source</button>
    </form>
  );
}
