import React from 'react';
import { V1OriginatorTitle } from './v1-originator';
import { OpulentoTitle } from './opulento';
import { ZeroZeroTitle } from './zero-zero';

export const TitleMap: Record<string, React.FC<any>> = {
  'V1OriginatorTitle': V1OriginatorTitle,
  'OpulentoTitle': OpulentoTitle,
  'ZeroZeroTitle': ZeroZeroTitle,
};
