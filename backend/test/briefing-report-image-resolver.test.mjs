import assert from "node:assert/strict";
import test from "node:test";
import { BriefingReportImageResolver } from "../dist/src/services/briefing-report-image-resolver.js";

test("image resolver deduplica, ignora anexos não visuais e limita vinte imagens", async () => {
    const downloads = [];
    const processed = [];
    const imageFiles = Array.from({ length: 22 }, (_, index) => ({
        driveFile: { id: `image-${index + 1}`, mimeType: "image/png" }
    }));
    const duplicate = { driveFile: { id: "image-1", mimeType: "image/png" } };
    const documentFile = { driveFile: { id: "pdf-1", mimeType: "application/pdf" } };
    const document = { responses: { attachments: [duplicate, documentFile, ...imageFiles] } };
    const resolver = new BriefingReportImageResolver(
        {
            async downloadReportImage(fileId) {
                downloads.push(fileId);
                return { data: Buffer.from(fileId), mimeType: "image/png", size: 10 };
            }
        },
        async (image, outputPath) => processed.push({ image: image.toString(), outputPath })
    );

    await resolver.prepare(document, "/tmp/report-images");

    assert.equal(downloads.length, 20);
    assert.deepEqual(downloads.slice(0, 3), ["image-1", "image-2", "image-3"]);
    assert.equal(new Set(downloads).size, 20);
    assert.equal(downloads.includes("pdf-1"), false);
    assert.equal(processed.at(-1).outputPath, "/tmp/report-images/image-20.jpg");
    assert.equal(duplicate.driveFile.localImageUrl, "file:///tmp/report-images/image-1.jpg");
    assert.equal(imageFiles[0].driveFile.localImageUrl, undefined);
});

test("image resolver registra uma falha e continua preparando as demais imagens", async () => {
    const warnings = [];
    const processed = [];
    const first = { driveFile: { id: "broken", mimeType: "image/jpeg" } };
    const second = { driveFile: { id: "valid", mimeType: "image/jpeg" } };
    const resolver = new BriefingReportImageResolver(
        {
            async downloadReportImage(fileId) {
                if (fileId === "broken") throw new Error("Drive indisponível");
                return { data: Buffer.from("valid"), mimeType: "image/jpeg", size: 5 };
            }
        },
        async (_image, outputPath) => processed.push(outputPath),
        (message, error) => warnings.push({ message, error })
    );

    await resolver.prepare({ attachments: [first, second] }, "/tmp/report-images");

    assert.equal(warnings.length, 1);
    assert.match(warnings[0].message, /broken/);
    assert.match(warnings[0].error.message, /Drive indisponível/);
    assert.deepEqual(processed, ["/tmp/report-images/image-2.jpg"]);
    assert.equal(first.driveFile.localImageUrl, undefined);
    assert.equal(second.driveFile.localImageUrl, "file:///tmp/report-images/image-2.jpg");
});
