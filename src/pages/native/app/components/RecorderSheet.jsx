import React, { useEffect, useRef, useState } from 'react'

// In-webview camera capture (getUserMedia), for Android where launching the
// system camera/picker is NOT survivable: One UI's low-memory killer reaps the
// backgrounded app process while the external activity is open, destroying the
// pending result (verified at length on a Galaxy Fold 7). Capturing INSIDE the
// webview never backgrounds the app, so there is nothing to reap.
//
// mode 'video' → record (MediaRecorder); mode 'photo' → single still (canvas).
// Front camera by default (personal messages / profile photos are self-facing).
const MAX_SECONDS = 180

// First supported container wins — mp4 (H.264) when offered, webm otherwise.
// Both play in the app and on the web where delegates watch released messages.
const MIME_CANDIDATES = [
  'video/mp4',
  'video/webm;codecs=h264,opus',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

export default function RecorderSheet({ mode = 'video', onUse, onClose }) {
  const isPhoto = mode === 'photo'
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const [phase, setPhase] = useState('starting') // starting | ready | recording | review | error
  const [seconds, setSeconds] = useState(0)
  const [reviewUrl, setReviewUrl] = useState(null)
  const [blob, setBlob] = useState(null)

  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const acquire = async () => {
    setPhase('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: !isPhoto,
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}) }
      setPhase('ready')
    } catch { setPhase('error') }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => { await acquire(); if (cancelled) stopStream() })()
    return () => {
      cancelled = true
      clearInterval(timerRef.current)
      try { recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop() } catch { /* already stopped */ }
      stopStream()
      if (reviewUrl) URL.revokeObjectURL(reviewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Photo: grab a single frame ──────────────────────────────
  const takePhoto = () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    const ctx = canvas.getContext('2d')
    // Un-mirror: the preview is flipped for a natural selfie view, but the saved
    // photo should read the right way round.
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((b) => {
      if (!b) return
      setBlob(b); setReviewUrl(URL.createObjectURL(b))
      stopStream(); setPhase('review')
    }, 'image/jpeg', 0.92)
  }

  // ── Video: record ───────────────────────────────────────────
  const startRec = () => {
    if (!streamRef.current) return
    const mimeType = MIME_CANDIDATES.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || ''
    let rec
    try { rec = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined) }
    catch { setPhase('error'); return }
    chunksRef.current = []
    rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data) }
    rec.onstop = () => {
      const type = rec.mimeType || mimeType || 'video/webm'
      const b = new Blob(chunksRef.current, { type })
      setBlob(b); setReviewUrl(URL.createObjectURL(b))
      stopStream(); setPhase('review')
    }
    recorderRef.current = rec
    rec.start(1000)
    setSeconds(0); setPhase('recording')
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s + 1 >= MAX_SECONDS) { try { rec.stop() } catch { /* noop */ } clearInterval(timerRef.current) }
        return s + 1
      })
    }, 1000)
  }
  const stopRec = () => { clearInterval(timerRef.current); try { recorderRef.current?.stop() } catch { /* noop */ } }

  const retake = () => {
    if (reviewUrl) URL.revokeObjectURL(reviewUrl)
    setReviewUrl(null); setBlob(null)
    acquire()
  }
  const use = () => {
    if (!blob) return
    const ext = isPhoto ? 'jpg' : (blob.type.includes('mp4') ? 'mp4' : 'webm')
    onUse(new File([blob], `${isPhoto ? 'photo' : 'message'}-${Date.now()}.${ext}`, { type: blob.type }))
  }

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: '#0d1628', display: 'flex', flexDirection: 'column' }}>
      <div className="fx jb ac" style={{ padding: '16px 18px' }}>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600 }}>
          {phase === 'review' ? (isPhoto ? 'Review your photo' : 'Review your video') : (isPhoto ? 'Take a photo' : 'Record a video')}
        </span>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 0, color: '#fff', borderRadius: 999, width: 32, height: 32, fontSize: 16, cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {phase !== 'review' && (
          <video ref={videoRef} autoPlay muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
        )}
        {phase === 'review' && reviewUrl && (isPhoto
          ? <img src={reviewUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
          : <video src={reviewUrl} controls playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
        )}
        {phase === 'starting' && <p style={{ position: 'absolute', top: '50%', width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Starting camera…</p>}
        {phase === 'error' && (
          <div style={{ position: 'absolute', top: '40%', width: '100%', textAlign: 'center', padding: '0 32px' }}>
            <p style={{ color: '#fff', fontSize: 15, lineHeight: 1.5 }}>We couldn't access the camera{isPhoto ? '' : ' and microphone'}. Please allow the permission for Everstead and try again.</p>
          </div>
        )}
        {phase === 'recording' && (
          <span style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', background: 'rgba(185,28,28,0.9)', color: '#fff', borderRadius: 999, padding: '4px 12px', fontSize: 13, fontWeight: 600 }}>● {fmt(seconds)}</span>
        )}
      </div>

      <div className="fx ac jc" style={{ padding: '18px 18px 34px', gap: 14 }}>
        {phase === 'ready' && !isPhoto && (
          <button onClick={startRec} aria-label="Start recording" style={{ width: 72, height: 72, borderRadius: 999, border: '4px solid #fff', background: '#b91c1c', cursor: 'pointer' }} />
        )}
        {phase === 'ready' && isPhoto && (
          <button onClick={takePhoto} aria-label="Take photo" style={{ width: 72, height: 72, borderRadius: 999, border: '4px solid #fff', background: '#fff', cursor: 'pointer' }} />
        )}
        {phase === 'recording' && (
          <button onClick={stopRec} aria-label="Stop recording" style={{ width: 72, height: 72, borderRadius: 999, border: '4px solid #fff', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 26, height: 26, background: '#b91c1c', borderRadius: 6 }} />
          </button>
        )}
        {phase === 'review' && (
          <>
            <button className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.12)', color: '#fff' }} onClick={retake}>Retake</button>
            <button className="btn" style={{ flex: 1 }} onClick={use}>{isPhoto ? 'Use this photo' : 'Use this video'}</button>
          </>
        )}
      </div>
    </div>
  )
}
