/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { transparentize } from '@elastic/eui';
import { CSSObject } from '@emotion/react';
import { useEuiTheme } from '../../hooks';

export const useStyles = () => {
  const { euiTheme, euiVars } = useEuiTheme();

  const cached = useMemo(() => {
    const { colors, font, size } = euiTheme;
    const defaultSelectionColor = colors.primary;

    const sessionViewProcessTree: CSSObject = {
      position: 'relative',
      fontFamily: font.familyCode,
      overflow: 'hidden',
      height: '100%',
      backgroundColor: euiVars.euiColorLightestShade,
      // paddingTop: size.base,
      paddingLeft: 0,
    };

    const selectionArea: CSSObject = {
      position: 'absolute',
      display: 'none',
      marginLeft: '-50%',
      width: '150%',
      height: '100%',
      backgroundColor: defaultSelectionColor,
      pointerEvents: 'none',
      opacity: 0.1,
      transform: `translateY(-${size.xs})`,
    };

    const processTree: CSSObject = {
      '&>div[role="rowgroup"]': {
        '&:before': {
          borderLeft: `2px dotted ${euiTheme.colors.lightShade}`,
          position: 'absolute',
          height: 'calc(100% - 64px)',
          content: `''`,
          left: '22px',
          top: '46px',
        },
        '&:after': {
          content: `''`,
          left: '19px',
          bottom: '16px',
          backgroundColor: euiTheme.colors.lightShade,
          width: '8px',
          height: '2px',
          borderRadius: '2px',
          position: 'absolute',
        },
      },
    };

    const defaultSelected = transparentize(colors.primary, 0.008);
    const alertSelected = transparentize(colors.danger, 0.008);

    return {
      sessionViewProcessTree,
      selectionArea,
      defaultSelected,
      alertSelected,
      processTree,
    };
  }, [euiTheme, euiVars]);

  return cached;
};
