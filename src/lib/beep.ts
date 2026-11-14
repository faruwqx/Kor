/**
 * Dinlenme dolunca çalan kısa uyarı sesi. Tarayıcılar sesi yalnızca kullanıcı
 * dokunuşundan sonra açar: primeSound() bir dokunuş sırasında (set tamamlanırken)
 * çağrılır, beep() daha sonra kendi başına çalabilir. Telefon sessizdeyse duyulmaz.
 */
let ctx: AudioContext | null = null

export function primeSound() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    // Ses desteklenmiyorsa uyarı yalnızca görsel ve titreşimli kalır.
  }
}

export function beep() {
  if (!ctx || ctx.state !== 'running') return
  const t0 = ctx.currentTime
  // İki kısa ton: tek bip, salon gürültüsünde kolay kaçar.
  for (const [offset, freq] of [
    [0, 880],
    [0.22, 1175],
  ]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, t0 + offset)
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.18)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t0 + offset)
    osc.stop(t0 + offset + 0.2)
  }
}
