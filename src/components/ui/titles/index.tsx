import React from 'react';
import { V1OriginatorTitle } from './v1-originator';
import { OpulentoTitle } from './opulento';
import { ZeroZeroTitle } from './zero-zero';
import { NovatrixCodeTitle } from './novatrix-code';
import { NovatrixQuantTitle } from './novatrix-quant';

export const TitleMap: Record<string, React.FC<any>> = {
  'V1OriginatorTitle': V1OriginatorTitle,
  'OpulentoTitle': OpulentoTitle,
  'ZeroZeroTitle': ZeroZeroTitle,
  'NovatrixCodeTitle': NovatrixCodeTitle,
  'NovatrixQuantTitle': NovatrixQuantTitle,
};
