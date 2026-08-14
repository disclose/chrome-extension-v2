import React from 'react';
import {Composition} from 'remotion';
import {z} from 'zod';
import {LookupDemo} from './LookupDemo';

export const lookupDemoSchema = z.object({
  domain: z.string(),
  release: z.string(),
});

export const Root: React.FC = () => {
  return (
    <Composition
      id="LookupDemo"
      component={LookupDemo}
      durationInFrames={570}
      fps={30}
      width={1280}
      height={720}
      schema={lookupDemoSchema}
      defaultProps={{domain: 'cloudflare.com', release: 'v0.2.0'}}
    />
  );
};
