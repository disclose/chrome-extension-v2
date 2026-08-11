import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import type {z} from 'zod';
import type {lookupDemoSchema} from './Root';
import {theme} from './theme';

type Props = z.infer<typeof lookupDemoSchema>;

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const fade = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, start + 15, end - 15, end], [0, 1, 1, 0], clamp);

const rise = (frame: number, start: number, distance = 28) =>
  interpolate(frame, [start, start + 22], [distance, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

const DotGrid: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 570], [0, 32], clamp);

  return (
    <AbsoluteFill
      style={{
        opacity: 0.32,
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(167,139,250,0.18) 1px, transparent 0)',
        backgroundSize: '28px 28px',
        backgroundPosition: `${drift}px ${drift / 2}px`,
        maskImage: 'linear-gradient(to right, black, transparent 75%)',
      }}
    />
  );
};

const Glow: React.FC = () => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 570], [-50, 90], clamp);

  return (
    <div
      style={{
        position: 'absolute',
        width: 620,
        height: 620,
        left: x,
        top: -230,
        borderRadius: '50%',
        background: 'rgba(103,58,183,0.28)',
        filter: 'blur(110px)',
      }}
    />
  );
};

const Brand: React.FC<{compact?: boolean}> = ({compact = false}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: compact ? 10 : 14}}>
    <div
      style={{
        width: compact ? 34 : 44,
        height: compact ? 34 : 44,
        borderRadius: 12,
        background: theme.purple,
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 10px 30px rgba(103,58,183,0.34)',
      }}
    >
      <Img
        src={staticFile('disclose-mark.png')}
        style={{width: compact ? 24 : 31, height: compact ? 24 : 31}}
      />
    </div>
    <div
      style={{
        color: theme.text,
        fontWeight: 760,
        fontSize: compact ? 22 : 28,
        letterSpacing: -0.7,
      }}
    >
      disclose.io
    </div>
  </div>
);

const LivePill: React.FC<{label?: string}> = ({label = 'LIVE API'}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '9px 14px',
      border: '1px solid rgba(66,211,146,0.3)',
      borderRadius: 999,
      color: '#9ef0c6',
      background: 'rgba(66,211,146,0.09)',
      fontSize: 14,
      fontWeight: 780,
      letterSpacing: 1.2,
    }}
  >
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: theme.green,
        boxShadow: '0 0 12px rgba(66,211,146,0.85)',
      }}
    />
    {label}
  </div>
);

const Header: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: 34,
      left: 46,
      right: 46,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 20,
    }}
  >
    <Brand compact />
    <LivePill />
  </div>
);

const Capture: React.FC<{
  src: string;
  top: number;
  width?: number;
  accent?: string;
}> = ({src, top, width = 1120, accent = theme.purple}) => (
  <div
    style={{
      position: 'relative',
      width: 602,
      height: 586,
      overflow: 'hidden',
      borderRadius: 25,
      background: '#fff',
      border: `1px solid ${theme.border}`,
      boxShadow: `0 28px 90px rgba(0,0,0,0.5), 0 0 0 1px ${accent}22`,
    }}
  >
    <Img
      src={staticFile(src)}
      style={{position: 'absolute', left: 0, top, width, height: 'auto'}}
    />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 25,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.2)',
        pointerEvents: 'none',
      }}
    />
  </div>
);

const Eyebrow: React.FC<React.PropsWithChildren> = ({children}) => (
  <div
    style={{
      color: theme.purpleBright,
      fontSize: 15,
      fontWeight: 800,
      letterSpacing: 2.2,
      marginBottom: 18,
    }}
  >
    {children}
  </div>
);

const Callout: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
  chips?: string[];
}> = ({eyebrow, title, body, chips = []}) => (
  <div style={{width: 490}}>
    <Eyebrow>{eyebrow}</Eyebrow>
    <div
      style={{
        color: theme.text,
        fontSize: 50,
        lineHeight: 1.03,
        fontWeight: 820,
        letterSpacing: -2.2,
      }}
    >
      {title}
    </div>
    <div
      style={{
        color: theme.muted,
        fontSize: 21,
        lineHeight: 1.45,
        marginTop: 24,
        maxWidth: 455,
      }}
    >
      {body}
    </div>
    {chips.length > 0 ? (
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 28}}>
        {chips.map((chip) => (
          <div
            key={chip}
            style={{
              color: theme.lavender,
              background: 'rgba(124,77,255,0.13)',
              border: '1px solid rgba(167,139,250,0.24)',
              borderRadius: 999,
              padding: '10px 14px',
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {chip}
          </div>
        ))}
      </div>
    ) : null}
  </div>
);

const Cursor: React.FC<{x: number; y: number; click: number}> = ({x, y, click}) => {
  const pulse = interpolate(click, [0, 0.35, 1], [0, 1, 0], clamp);
  return (
    <div style={{position: 'absolute', left: x, top: y, zIndex: 30}}>
      <div
        style={{
          position: 'absolute',
          width: 70,
          height: 70,
          left: -25,
          top: -25,
          borderRadius: '50%',
          border: `3px solid ${theme.purpleBright}`,
          opacity: pulse,
          transform: `scale(${0.45 + pulse * 0.8})`,
        }}
      />
      <div
        style={{
          width: 27,
          height: 38,
          background: '#fff',
          clipPath: 'polygon(0 0, 0 100%, 28% 74%, 47% 100%, 63% 90%, 45% 66%, 80% 66%)',
          filter: 'drop-shadow(0 4px 5px rgba(0,0,0,0.65))',
          transform: `scale(${1 - pulse * 0.12})`,
        }}
      />
    </div>
  );
};

const Intro: React.FC<{domain: string}> = ({domain}) => {
  const frame = useCurrentFrame();
  const opacity = fade(frame, 0, 75);
  const scale = spring({frame, fps: 30, config: {damping: 18, stiffness: 110}});

  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        transform: `scale(${0.96 + scale * 0.04})`,
      }}
    >
      <div style={{marginBottom: 30}}><Brand /></div>
      <div
        style={{
          color: theme.text,
          fontSize: 68,
          lineHeight: 0.98,
          fontWeight: 850,
          letterSpacing: -3.6,
          maxWidth: 850,
        }}
      >
        Find the right security contact.
      </div>
      <div style={{color: theme.purpleBright, fontSize: 33, fontWeight: 700, marginTop: 26}}>
        A live lookup for {domain}
      </div>
    </AbsoluteFill>
  );
};

const DirectoryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const absolute = frame + 75;
  const opacity = fade(absolute, 75, 210);
  const imageTop = interpolate(frame, [0, 90, 130], [-150, -330, -345], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const cursorProgress = interpolate(frame, [75, 110], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const click = interpolate(frame, [110, 118, 132], [0, 1, 0], clamp);
  const x = interpolate(cursorProgress, [0, 1], [525, 345], clamp);
  const y = interpolate(cursorProgress, [0, 1], [395, 557], clamp);

  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: 'absolute', left: 48, top: 104}}>
        <Capture src="initial.png" top={imageTop} />
      </div>
      <Cursor x={x} y={y} click={click} />
      <div
        style={{
          position: 'absolute',
          left: 720,
          top: 168,
          transform: `translateY(${rise(absolute, 88)}px)`,
        }}
      >
        <Callout
          eyebrow="DIRECTORY SIGNAL"
          title={<>A reporting route already exists.</>}
          body={<>The extension reads disclose.io’s live directory API before you need to hunt for a contact.</>}
          chips={['Basic maturity · 47', 'Policy found', 'security.txt found']}
        />
      </div>
    </AbsoluteFill>
  );
};

const LookupTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const absolute = frame + 210;
  const opacity = fade(absolute, 210, 285);
  const progress = interpolate(frame, [10, 58], [0.06, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
  const enter = spring({frame, fps: 30, config: {damping: 17, stiffness: 100}});

  return (
    <AbsoluteFill style={{opacity, alignItems: 'center', justifyContent: 'center'}}>
      <div
        style={{
          width: 770,
          padding: '52px 62px',
          borderRadius: 34,
          border: `1px solid ${theme.border}`,
          background: 'linear-gradient(145deg, rgba(33,23,47,0.97), rgba(20,14,31,0.97))',
          boxShadow: '0 34px 110px rgba(0,0,0,0.5)',
          transform: `scale(${0.94 + enter * 0.06})`,
          textAlign: 'center',
        }}
      >
        <Eyebrow>ONE CLICK · LIVE LOOKUP</Eyebrow>
        <div style={{fontSize: 51, color: theme.text, fontWeight: 830, letterSpacing: -2}}>
          Resolve the best route.
        </div>
        <div style={{display: 'flex', justifyContent: 'center', gap: 12, marginTop: 28}}>
          {['security.txt', 'VDP programs', 'CNA + CERT'].map((label, index) => {
            const chipOpacity = interpolate(frame, [18 + index * 8, 34 + index * 8], [0, 1], clamp);
            return (
              <div
                key={label}
                style={{
                  opacity: chipOpacity,
                  color: theme.lavender,
                  fontSize: 17,
                  fontWeight: 700,
                  background: 'rgba(124,77,255,0.12)',
                  border: '1px solid rgba(167,139,250,0.22)',
                  borderRadius: 999,
                  padding: '10px 15px',
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
        <div style={{height: 8, borderRadius: 99, background: '#100b19', marginTop: 38, overflow: 'hidden'}}>
          <div
            style={{
              width: `${progress * 100}%`,
              height: '100%',
              borderRadius: 99,
              background: `linear-gradient(90deg, ${theme.purple}, ${theme.green})`,
              boxShadow: '0 0 24px rgba(124,77,255,0.7)',
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const FirstPartyScene: React.FC = () => {
  const frame = useCurrentFrame();
  const absolute = frame + 285;
  const opacity = fade(absolute, 285, 420);
  const top = interpolate(frame, [0, 105], [-680, -940], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: 'absolute', left: 48, top: 104}}>
        <Capture src="result-top.png" top={top} accent={theme.green} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 720,
          top: 175,
          transform: `translateY(${rise(absolute, 300)}px)`,
        }}
      >
        <Callout
          eyebrow="LIVE LOOKUP RESULT"
          title={<>First-party route found.</>}
          body={<>Owner channels come first: security.txt, the Cloudflare disclosure program, and verified reporting contacts.</>}
          chips={['Done in 0.1s', 'High-confidence routes', 'Copy-ready contacts']}
        />
      </div>
    </AbsoluteFill>
  );
};

const FallbackScene: React.FC = () => {
  const frame = useCurrentFrame();
  const absolute = frame + 420;
  const opacity = fade(absolute, 420, 510);
  const top = interpolate(frame, [0, 75], [-230, -500], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: 'absolute', left: 48, top: 104}}>
        <Capture src="result-bottom.png" top={top} accent={theme.orange} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 720,
          top: 175,
          transform: `translateY(${rise(absolute, 433)}px)`,
        }}
      >
        <Callout
          eyebrow="HONEST FALLBACKS"
          title={<>Fallbacks stay clearly labeled.</>}
          body={<>CNA and CERT/CC routes remain available without being mistaken for the site owner.</>}
          chips={['Coordinator fallback', 'Route provenance', 'No false ownership']}
        />
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{release: string}> = ({release}) => {
  const frame = useCurrentFrame();
  const absolute = frame + 510;
  const opacity = interpolate(absolute, [510, 527], [0, 1], clamp);
  const enter = spring({frame, fps: 30, config: {damping: 18, stiffness: 105}});

  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        transform: `translateY(${(1 - enter) * 26}px)`,
      }}
    >
      <Brand />
      <div
        style={{
          color: theme.text,
          fontSize: 62,
          lineHeight: 1.02,
          fontWeight: 850,
          letterSpacing: -3,
          maxWidth: 820,
          marginTop: 34,
        }}
      >
        Know where to report. Before you need to.
      </div>
      <div style={{color: theme.muted, fontSize: 22, marginTop: 26}}>
        Open source · Chrome Manifest V3 · {release}
      </div>
      <div
        style={{
          color: theme.lavender,
          background: 'rgba(124,77,255,0.14)',
          border: '1px solid rgba(167,139,250,0.28)',
          borderRadius: 999,
          padding: '13px 20px',
          fontSize: 18,
          fontWeight: 760,
          marginTop: 30,
        }}
      >
        github.com/disclose/chrome-extension-v2
      </div>
    </AbsoluteFill>
  );
};

export const LookupDemo: React.FC<Props> = ({domain, release}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(circle at 20% 10%, #211238 0%, ${theme.background} 48%, #09070e 100%)`,
      color: theme.text,
      fontFamily: 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
    }}
  >
    <Glow />
    <DotGrid />
    <Header />
    <Intro domain={domain} />
    <Sequence from={75} durationInFrames={135} premountFor={30}>
      <DirectoryScene />
    </Sequence>
    <Sequence from={210} durationInFrames={75} premountFor={30}>
      <LookupTransition />
    </Sequence>
    <Sequence from={285} durationInFrames={135} premountFor={30}>
      <FirstPartyScene />
    </Sequence>
    <Sequence from={420} durationInFrames={90} premountFor={30}>
      <FallbackScene />
    </Sequence>
    <Sequence from={510} durationInFrames={60} premountFor={30}>
      <Outro release={release} />
    </Sequence>
  </AbsoluteFill>
);
