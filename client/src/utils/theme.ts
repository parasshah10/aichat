export const applyFontSize = (val: string) => {
  const root = document.documentElement;
  
  // Handle all the granular font size options
  switch (val) {
    case 'text-xs':
      root.style.setProperty('--markdown-font-size', '0.75rem'); // 12px
      break;
    case 'text-xs-plus':
      root.style.setProperty('--markdown-font-size', '0.78125rem'); // 12.5px
      break;
    case 'text-2xs':
      root.style.setProperty('--markdown-font-size', '0.8125rem'); // 13px
      break;
    case 'text-sm-minus':
      root.style.setProperty('--markdown-font-size', '0.84375rem'); // 13.5px
      break;
    case 'text-sm':
      root.style.setProperty('--markdown-font-size', '0.875rem'); // 14px
      break;
    case 'text-sm-plus':
      root.style.setProperty('--markdown-font-size', '0.90625rem'); // 14.5px
      break;
    case 'text-md-minus':
      root.style.setProperty('--markdown-font-size', '0.9375rem'); // 15px
      break;
    case 'text-md':
      root.style.setProperty('--markdown-font-size', '0.96875rem'); // 15.5px
      break;
    case 'text-base':
      root.style.setProperty('--markdown-font-size', '1rem'); // 16px
      break;
    case 'text-base-plus':
      root.style.setProperty('--markdown-font-size', '1.03125rem'); // 16.5px
      break;
    case 'text-lg-minus':
      root.style.setProperty('--markdown-font-size', '1.0625rem'); // 17px
      break;
    case 'text-lg-small':
      root.style.setProperty('--markdown-font-size', '1.09375rem'); // 17.5px
      break;
    case 'text-lg':
      root.style.setProperty('--markdown-font-size', '1.125rem'); // 18px
      break;
    case 'text-lg-plus':
      root.style.setProperty('--markdown-font-size', '1.15625rem'); // 18.5px
      break;
    case 'text-xl-minus':
      root.style.setProperty('--markdown-font-size', '1.1875rem'); // 19px
      break;
    case 'text-xl-small':
      root.style.setProperty('--markdown-font-size', '1.21875rem'); // 19.5px
      break;
    case 'text-xl':
      root.style.setProperty('--markdown-font-size', '1.25rem'); // 20px
      break;
    case 'text-xl-plus':
      root.style.setProperty('--markdown-font-size', '1.28125rem'); // 20.5px
      break;
    case 'text-2xl-minus':
      root.style.setProperty('--markdown-font-size', '1.3125rem'); // 21px
      break;
    case 'text-2xl':
      root.style.setProperty('--markdown-font-size', '1.375rem'); // 22px
      break;
    default:
      root.style.setProperty('--markdown-font-size', '1rem'); // 16px fallback
      break;
  }
};

export const getInitialTheme = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedPrefs = window.localStorage.getItem('color-theme');
    if (typeof storedPrefs === 'string') {
      return storedPrefs;
    }

    const userMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (userMedia.matches) {
      return 'dark';
    }
  }

  return 'light'; // light theme as the default;
};
