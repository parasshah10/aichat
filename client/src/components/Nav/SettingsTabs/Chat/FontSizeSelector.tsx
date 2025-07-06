import { useRecoilState } from 'recoil';
import { Dropdown } from '~/components/ui';
import { applyFontSize } from '~/utils';
import { useLocalize } from '~/hooks';
import store from '~/store';

export default function FontSizeSelector() {
  const [fontSize, setFontSize] = useRecoilState(store.fontSize);
  const localize = useLocalize();

  const handleChange = (val: string) => {
    setFontSize(val);
    applyFontSize(val);
  };

  const options = [
    { value: 'text-xs', label: 'Extra Small (12px)' },
    { value: 'text-xs-plus', label: 'XS+ (12.5px)' },
    { value: 'text-2xs', label: 'XXS (13px)' },
    { value: 'text-sm-minus', label: 'SM- (13.5px)' },
    { value: 'text-sm', label: 'Small (14px)' },
    { value: 'text-sm-plus', label: 'SM+ (14.5px)' },
    { value: 'text-md-minus', label: 'MD- (15px)' },
    { value: 'text-md', label: 'Medium (15.5px)' },
    { value: 'text-base', label: 'Base (16px)' },
    { value: 'text-base-plus', label: 'Base+ (16.5px)' },
    { value: 'text-lg-minus', label: 'LG- (17px)' },
    { value: 'text-lg-small', label: 'LG Small (17.5px)' },
    { value: 'text-lg', label: 'Large (18px)' },
    { value: 'text-lg-plus', label: 'LG+ (18.5px)' },
    { value: 'text-xl-minus', label: 'XL- (19px)' },
    { value: 'text-xl-small', label: 'XL Small (19.5px)' },
    { value: 'text-xl', label: 'Extra Large (20px)' },
    { value: 'text-xl-plus', label: 'XL+ (20.5px)' },
    { value: 'text-2xl-minus', label: '2XL- (21px)' },
    { value: 'text-2xl', label: '2X Large (22px)' },
  ];

  return (
    <div className="flex w-full items-center justify-between">
      <div>{localize('com_nav_font_size')}</div>
      <Dropdown
        value={fontSize}
        options={options}
        onChange={handleChange}
        testId="font-size-selector"
        sizeClasses="w-[150px]"
        className="z-50"
      />
    </div>
  );
}
