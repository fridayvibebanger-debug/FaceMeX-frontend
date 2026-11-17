import { useEffect, useRef } from 'react';
import type { VoiceSessionStatus } from './VoiceStatus';

type VoiceOrbProps = {
  status: VoiceSessionStatus;
  analyser: AnalyserNode | null;
};

const WAVEFORM_BARS = 29;
const MAX_BAR_HEIGHT = 36;

export default function VoiceOrb({ status, analyser }: VoiceOrbProps) {
  const waveformRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const waveform = waveformRef.current;
    if (!waveform) return;

    const bars = Array.from(waveform.children) as HTMLSpanElement[];
    const levels = new Float32Array(bars.length);
    if (!analyser) {
      bars.forEach((bar) => {
        bar.style.height = '2px';
        bar.style.opacity = '0.45';
      });
      return;
    }

    const samples = new Uint8Array(analyser.fftSize);
    let frame = 0;

    const updateWaveform = () => {
      analyser.getByteTimeDomainData(samples);
      bars.forEach((bar, index) => {
        const start = Math.floor(index * samples.length / bars.length);
        const end = Math.max(start + 1, Math.floor((index + 1) * samples.length / bars.length));
        let energy = 0;
        for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
          const amplitude = (samples[sampleIndex] - 128) / 128;
          energy += amplitude * amplitude;
        }

        const rms = Math.sqrt(energy / (end - start));
        const target = Math.min(1, Math.max(0, rms - 0.012) * 10);
        levels[index] += (target - levels[index]) * (target > levels[index] ? 0.65 : 0.22);
        bar.style.height = `${2 + levels[index] * MAX_BAR_HEIGHT}px`;
        bar.style.opacity = `${0.45 + levels[index] * 0.55}`;
      });
      frame = window.requestAnimationFrame(updateWaveform);
    };

    frame = window.requestAnimationFrame(updateWaveform);
    return () => window.cancelAnimationFrame(frame);
  }, [analyser]);

  return (
    <div className={`facemex-voice-orb facemex-voice-orb--${status}`} aria-hidden="true">
      <div className="facemex-voice-orb__glow" />
      <div className="facemex-voice-orb__core">
        <div className="facemex-voice-orb__waveform" ref={waveformRef}>
          {Array.from({ length: WAVEFORM_BARS }, (_, index) => (
            <span
              key={index}
              style={{ height: '2px', opacity: 0.45 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
