import React, { useState, useEffect } from 'react';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { app } from '../../lib/firebase';

interface FirebaseImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallback?: string;
}

export function FirebaseImage({ src, fallback, ...props }: FirebaseImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string>(src);

  useEffect(() => {
    let isMounted = true;

    async function resolveUrl() {
      if (!src) {
        if (fallback) setResolvedSrc(fallback);
        return;
      }

      if (src.startsWith('gs://')) {
        try {
          const storage = getStorage(app);
          let adjustedSrc = src;
          adjustedSrc = adjustedSrc.replace(/sponsors\/scriptless\.png/i, "Sponsors/scriptless.png");
          const imageRef = ref(storage, adjustedSrc);
          const url = await getDownloadURL(imageRef);
          if (isMounted) {
            setResolvedSrc(url);
          }
        } catch (error) {
          console.error("Error resolving Firebase Storage URL:", src, error);
          if (fallback && isMounted) {
            setResolvedSrc(fallback);
          }
        }
      } else {
        if (isMounted) {
          setResolvedSrc(src);
        }
      }
    }

    resolveUrl();

    return () => {
      isMounted = false;
    };
  }, [src, fallback]);

  return (
    <img
      src={resolvedSrc}
      {...props}
      loading="lazy"
      crossOrigin="anonymous"
      onError={(e) => {
        if (fallback) {
          e.currentTarget.src = fallback;
          e.currentTarget.onerror = null; // Prevent infinite loop if fallback also fails
        }
      }}
    />
  );
}
