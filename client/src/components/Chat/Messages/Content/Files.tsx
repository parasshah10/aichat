import { useMemo, memo } from 'react';
import type { TFile, TMessage } from 'librechat-data-provider';
import FileContainer from '~/components/Chat/Input/Files/FileContainer';
import Image from './Image';
import { cn } from '~/utils';

const Files = ({ message }: { message?: TMessage }) => {
  const imageFiles = useMemo(() => {
    return message?.files?.filter((file) => file.type?.startsWith('image/')) || [];
  }, [message?.files]);

  const otherFiles = useMemo(() => {
    return message?.files?.filter((file) => !(file.type?.startsWith('image/') === true)) || [];
  }, [message?.files]);

  return (
    <>
      {otherFiles.length > 0 &&
        otherFiles.map((file) => <FileContainer key={file.file_id} file={file as TFile} />)}
      {imageFiles.length > 0 && (
        <div className={cn(
          'flex gap-2 mt-2',
          imageFiles.length === 1 ? 'flex-col' : 'flex-wrap'
        )}>
          {imageFiles.map((file) => (
            <Image
              key={file.file_id}
              imagePath={file.preview ?? file.filepath ?? ''}
              height={file.height ?? 1920}
              width={file.width ?? 1080}
              altText={file.filename ?? 'Uploaded Image'}
              placeholderDimensions={{
                height: `${file.height ?? 1920}px`,
                width: `${file.width ?? 1080}px`,
              }}
              className=""
            />
          ))}
        </div>
      )}
    </>
  );
};

export default memo(Files);
