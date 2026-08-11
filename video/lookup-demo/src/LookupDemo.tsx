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

const sceneFade = (frame: number, duration: number) =>
  interpolate(frame, [0, 14, duration - 14, duration], [0, 1, 1, 0], clamp);

const rise = (frame: number, start = 0, distance = 28) =>
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

const OfficialBrand: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      height: 58,
      padding: '7px 15px',
      borderRadius: 18,
      background: 'rgba(255,255,255,0.97)',
      border: '1px solid rgba(255,255,255,0.74)',
      boxShadow: '0 14px 42px rgba(0,0,0,0.3)',
    }}
  >
    <Img src={staticFile('disclose-logo.svg')} style={{width: 136, height: 'auto'}} />
  </div>
);

const LivePill: React.FC = () => (
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
    LIVE DIRECTORY
  </div>
);

const Header: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: 26,
      left: 38,
      right: 42,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 50,
    }}
  >
    <OfficialBrand />
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

const Intro: React.FC<{domain: string}> = ({domain}) => {
  const frame = useCurrentFrame();
  const opacity = sceneFade(frame, 75);
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
      <Eyebrow>THE DISCLOSE.IO DIRECTORY</Eyebrow>
      <div
        style={{
          color: theme.text,
          fontSize: 68,
          lineHeight: 0.98,
          fontWeight: 850,
          letterSpacing: -3.6,
          maxWidth: 870,
        }}
      >
        Disclosure maturity.<br />At a glance.
      </div>
      <div style={{color: theme.purpleBright, fontSize: 31, fontWeight: 700, marginTop: 26}}>
        A live directory check for {domain}
      </div>
    </AbsoluteFill>
  );
};

const DirectoryScene: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = sceneFade(frame, 165);
  const imageTop = interpolate(frame, [0, 125], [-168, -268], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: 'absolute', left: 48, top: 104}}>
        <Capture src="initial.png" top={imageTop} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 720,
          top: 158,
          transform: `translateY(${rise(frame, 10)}px)`,
        }}
      >
        <Callout
          eyebrow="DIRECTORY MEMBERSHIP"
          title={<>In the directory.</>}
          body={<>The extension reads Cloudflare’s structured disclose.io directory record and turns it into one clear maturity signal.</>}
          chips={['Basic maturity', 'Score 47', 'Policy + security.txt']}
        />
      </div>
    </AbsoluteFill>
  );
};

const SignalRow: React.FC<{
  label: string;
  value: string;
  positive: boolean;
  delay: number;
}> = ({label, value, positive, delay}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 14], [0, 1], clamp);
  const x = interpolate(frame, [delay, delay + 20], [-18, 0], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${x}px)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '13px 0',
        borderTop: `1px solid ${theme.border}`,
      }}
    >
      <span style={{color: theme.muted, fontSize: 19, fontWeight: 650}}>{label}</span>
      <span
        style={{
          color: positive ? '#9ef0c6' : '#d1c9da',
          background: positive ? 'rgba(66,211,146,0.11)' : 'rgba(188,178,202,0.09)',
          border: `1px solid ${positive ? 'rgba(66,211,146,0.25)' : theme.border}`,
          borderRadius: 999,
          padding: '7px 11px',
          fontSize: 15,
          fontWeight: 760,
        }}
      >
        {positive ? '✓' : '×'} {value}
      </span>
    </div>
  );
};

const MaturityCard: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = spring({frame, fps: 30, config: {damping: 18, stiffness: 105}});
  const score = Math.round(interpolate(frame, [10, 74], [0, 47], clamp));
  const bar = interpolate(frame, [14, 74], [0, 47], {
    ...clamp,
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        width: 520,
        padding: '34px 38px 28px',
        borderRadius: 30,
        border: `1px solid ${theme.border}`,
        background: 'linear-gradient(145deg, rgba(33,23,47,0.98), rgba(20,14,31,0.98))',
        boxShadow: '0 34px 110px rgba(0,0,0,0.5)',
        transform: `scale(${0.95 + enter * 0.05})`,
      }}
    >
      <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between'}}>
        <div>
          <div style={{color: theme.purpleBright, fontSize: 15, fontWeight: 800, letterSpacing: 2}}>
            MATURITY SCORE
          </div>
          <div style={{color: theme.text, fontSize: 94, lineHeight: 0.95, fontWeight: 860, letterSpacing: -5}}>
            {score}
          </div>
        </div>
        <div
          style={{
            color: theme.lavender,
            background: 'rgba(124,77,255,0.17)',
            border: '1px solid rgba(167,139,250,0.28)',
            borderRadius: 13,
            padding: '10px 15px',
            fontSize: 20,
            fontWeight: 800,
            marginBottom: 6,
          }}
        >
          Basic
        </div>
      </div>
      <div style={{height: 9, borderRadius: 99, background: '#100b19', margin: '22px 0 19px', overflow: 'hidden'}}>
        <div
          style={{
            width: `${bar}%`,
            height: '100%',
            borderRadius: 99,
            background: `linear-gradient(90deg, ${theme.purple}, ${theme.purpleBright})`,
            boxShadow: '0 0 24px rgba(124,77,255,0.7)',
          }}
        />
      </div>
      <SignalRow label="Safe harbor" value="Not published" positive={false} delay={30} />
      <SignalRow label="Bug bounty" value="Not listed" positive={false} delay={40} />
      <SignalRow label="Disclosure policy" value="Published" positive delay={50} />
      <SignalRow label="security.txt" value="Published" positive delay={60} />
    </div>
  );
};

const SignalsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = sceneFade(frame, 165);

  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: 'absolute', left: 72, top: 132}}>
        <MaturityCard />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 690,
          top: 164,
          transform: `translateY(${rise(frame, 14)}px)`,
        }}
      >
        <Callout
          eyebrow="DISCLOSURE MATURITY"
          title={<>Four signals.<br />One score.</>}
          body={<>Safe harbor, bounty, policy, and security.txt make the organization’s disclosure posture easy to compare at a glance.</>}
          chips={['Structured directory data', 'Readable verdict', 'Toolbar signal']}
        />
      </div>
    </AbsoluteFill>
  );
};

const LookupSupportScene: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = sceneFade(frame, 90);
  const imageTop = interpolate(frame, [0, 70], [-680, -930], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{opacity}}>
      <div style={{position: 'absolute', left: 48, top: 104}}>
        <Capture src="result-top.png" top={imageTop} accent={theme.green} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 720,
          top: 164,
          transform: `translateY(${rise(frame, 8)}px)`,
        }}
      >
        <Callout
          eyebrow="OPTIONAL DEEPER LOOKUP"
          title={<>Need the underlying route?</>}
          body={<>A live lookup is one click away when you need details. The directory maturity signal still comes first.</>}
          chips={['First-party route', 'Done in 0.1s']}
        />
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC<{release: string}> = ({release}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 16], [0, 1], clamp);
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
      <div style={{color: theme.purpleBright, fontSize: 18, fontWeight: 800, letterSpacing: 2.4}}>
        DIRECTORY.DISCLOSE.IO
      </div>
      <div
        style={{
          color: theme.text,
          fontSize: 62,
          lineHeight: 1.02,
          fontWeight: 850,
          letterSpacing: -3,
          maxWidth: 850,
          marginTop: 22,
        }}
      >
        Know a site’s disclosure maturity.<br />At a glance.
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
    <Sequence from={0} durationInFrames={75} premountFor={30}>
      <Intro domain={domain} />
    </Sequence>
    <Sequence from={75} durationInFrames={165} premountFor={30}>
      <DirectoryScene />
    </Sequence>
    <Sequence from={240} durationInFrames={165} premountFor={30}>
      <SignalsScene />
    </Sequence>
    <Sequence from={405} durationInFrames={90} premountFor={30}>
      <LookupSupportScene />
    </Sequence>
    <Sequence from={495} durationInFrames={75} premountFor={30}>
      <Outro release={release} />
    </Sequence>
    <Header />
  </AbsoluteFill>
);
