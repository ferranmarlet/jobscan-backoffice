import { useRef, useState, type ChangeEvent } from 'react'

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

export function ResumeUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Cancelling the file picker keeps the current file.
    if (e.target.files?.[0]) setFile(e.target.files[0])
  }

  const remove = () => {
    setFile(null)
    // Without this, choosing the same file again wouldn't fire a change event.
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <section className="resume-upload" aria-labelledby="resume-upload-title">
      <h2 id="resume-upload-title">Upload your resume</h2>
      <p>PDF, DOC or DOCX</p>
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={handleChange} />
      <div className="resume-upload-controls">
        <button onClick={() => inputRef.current?.click()}>{file ? 'Replace file' : 'Choose file'}</button>
        {file && (
          <>
            <span className="resume-upload-file">
              {file.name} ({formatSize(file.size)})
            </span>
            <button onClick={remove} aria-label={`Remove ${file.name}`}>
              Remove
            </button>
          </>
        )}
      </div>
    </section>
  )
}
