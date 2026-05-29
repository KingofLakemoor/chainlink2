import React from 'react';
import { V1OriginatorTitle } from './v1-originator';
import { XenonTerminalTitle } from './xenon-terminal';

export const TitleMap: Record<string, React.FC<any>> = {
  'V1OriginatorTitle': V1OriginatorTitle,
  'XenonTerminalTitle': XenonTerminalTitle,
};
