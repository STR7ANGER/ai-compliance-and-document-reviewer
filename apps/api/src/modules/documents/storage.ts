import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface ObjectStorage {
  uploadUrl(input: {
    objectKey: string;
    mediaType: string;
    sizeBytes: number;
    sha256: string;
  }): Promise<string>;
  downloadUrl(objectKey: string): Promise<string>;
  deleteObject(objectKey: string): Promise<void>;
}

export class S3ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;
  constructor(
    private readonly bucket: string,
    config: {
      endpoint: string;
      region: string;
      accessKey: string;
      secretKey: string;
    },
  ) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    });
  }
  uploadUrl(input: {
    objectKey: string;
    mediaType: string;
    sizeBytes: number;
    sha256: string;
  }) {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.objectKey,
        ContentType: input.mediaType,
        ContentLength: input.sizeBytes,
        Metadata: { sha256: input.sha256 },
      }),
      { expiresIn: 300 },
    );
  }
  downloadUrl(objectKey: string) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ResponseContentDisposition: "inline",
      }),
      { expiresIn: 300 },
    );
  }
  async deleteObject(objectKey: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }
}
