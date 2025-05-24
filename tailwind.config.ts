import typography from '@tailwindcss/typography';
import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

const gridColsFlowPlugin = plugin(({ matchUtilities, theme }: { matchUtilities: any; theme: any }) => {
  matchUtilities(
    {
      'grid-cols-flow': (value: any) => {
        return {
          'grid-template-columns': `repeat(auto-fill, minmax(${value}, 1fr))`
        };
      }
    },
    {
      values: theme('width')
    }
  );
});

const animationDelayPlugin = plugin(({ matchUtilities, theme }: { matchUtilities: any; theme: any }) => {
  matchUtilities(
    {
      'animation-delay': (value: any) => {
        return {
          'animation-delay': value
        };
      }
    },
    {
      values: theme('transitionDelay')
    }
  );
});

const animationFillPlugin = plugin(
  ({ matchUtilities, theme }: { matchUtilities: any; theme: any }) => {
    matchUtilities(
      {
        'animation-fill': (value: any) => {
          return {
            'animation-fill-mode': value
          };
        }
      },
      {
        values: theme('animationFillMode')
      }
    );
  },
  {
    theme: {
      animationFillMode: {
        none: 'none',
        forward: 'forwards',
        backward: 'backwards',
        both: 'both'
      }
    }
  }
);

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', './posts/*.mdx'],
  darkMode: 'class',
  theme: {
    extend: {
      typography: ({ theme }: { theme: any }) => ({
        DEFAULT: {
          css: {
            code: {
              backgroundColor: 'hsl(var(--theme-content) / 0.05)',
              borderRadius: theme('borderRadius.md'),
              paddingTop: theme('padding[1]'),
              paddingRight: theme('padding[1.5]'),
              paddingBottom: theme('padding[1]'),
              paddingLeft: theme('padding[1.5]')
            },
            'code::before': {
              content: 'normal'
            },
            'code::after': {
              content: 'normal'
            },
            p: {
              '&::before': {
                content: 'none !important'
              },
              '&::after': {
                content: 'none !important'
              }
            }
          }
        }
      })
    }
  },
  plugins: [gridColsFlowPlugin, animationDelayPlugin, animationFillPlugin, typography]
};

export default config;
