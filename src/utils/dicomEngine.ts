import daikon from 'daikon';

export interface DicomMetadata {
  age?: number;
  sex?: 'M' | 'F';
  patientId?: string;
  imageUrl?: string;
  success: boolean;
  error?: string;
}

export const extractDicomMetadata = async (file: File): Promise<DicomMetadata> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) throw new Error("Could not read file");

        // Parse with daikon
        const dataView = new DataView(arrayBuffer);
        const image = daikon.Series.parseImage(dataView);
        if (!image) throw new Error("Failed to parse DICOM image");

        // Extract metadata safely
        let parsedAge: number | undefined;
        let parsedSex: 'M' | 'F' | undefined;
        let patientId = "UNKNOWN";

        const ageTag = image.getTag(0x0010, 0x1010);
        if (ageTag && ageTag.value && ageTag.value[0]) {
          const match = ageTag.value[0].toString().match(/(\d+)/);
          if (match) parsedAge = parseInt(match[1], 10);
        }

        const sexTag = image.getTag(0x0010, 0x0040);
        if (sexTag && sexTag.value && sexTag.value[0]) {
          const sexStr = sexTag.value[0];
          if (sexStr === 'M' || sexStr === 'F') parsedSex = sexStr;
        }

        const idTag = image.getTag(0x0010, 0x0020);
        if (idTag && idTag.value && idTag.value[0]) {
          patientId = idTag.value[0].toString();
        }

        // Render pixel data
        const width = image.getCols();
        const height = image.getRows();
        const pixels = image.getInterpretedData(false, false);
        
        let imageUrl: string | undefined;

        if (width && height && pixels) {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            const imageData = ctx.createImageData(width, height);
            
            // Try to get windowing from tags, fallback to min/max scanning
            let windowCenter = image.getWindowCenter();
            let windowWidth = image.getWindowWidth();
            
            if (Array.isArray(windowCenter)) windowCenter = windowCenter[0];
            if (Array.isArray(windowWidth)) windowWidth = windowWidth[0];

            if (windowCenter === null || windowWidth === null) {
              let min = Infinity;
              let max = -Infinity;
              for (let i = 0; i < pixels.length; i++) {
                if (pixels[i] < min) min = pixels[i];
                if (pixels[i] > max) max = pixels[i];
              }
              windowWidth = max - min;
              windowCenter = min + windowWidth / 2;
            }

            const minWin = windowCenter - windowWidth / 2;

            for (let i = 0; i < pixels.length; i++) {
              let val = ((pixels[i] - minWin) / windowWidth) * 255;
              val = Math.max(0, Math.min(255, val));
              
              const idx = i * 4;
              imageData.data[idx] = val;     // R
              imageData.data[idx + 1] = val; // G
              imageData.data[idx + 2] = val; // B
              imageData.data[idx + 3] = 255; // Alpha
            }

            ctx.putImageData(imageData, 0, 0);
            imageUrl = canvas.toDataURL('image/jpeg', 0.8);
          }
        }

        resolve({
          age: parsedAge,
          sex: parsedSex,
          patientId,
          imageUrl,
          success: true
        });

      } catch (err: any) {
        console.error("DICOM Parsing Error:", err);
        resolve({
          success: false,
          error: err.message || "Invalid DICOM format or compressed pixel data unsupported."
        });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, error: "FileReader failed to read the file" });
    };

    reader.readAsArrayBuffer(file);
  });
};
