"use server";

import { redirect } from "next/navigation";
import { createPastedSource, createUploadedSource } from "./source-service";

function sourceRedirect(projectId: string, status: "error" | "success") {
  return `/projects/${projectId}?source_${status}=1`;
}

export async function createPastedSourceAction(projectId: string, formData: FormData) {
  try {
    await createPastedSource(projectId, {
      text: String(formData.get("text") ?? ""),
      title: String(formData.get("title") ?? "")
    });
  } catch {
    redirect(sourceRedirect(projectId, "error"));
  }

  redirect(sourceRedirect(projectId, "success"));
}

export async function createUploadedSourceAction(projectId: string, formData: FormData) {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    redirect(sourceRedirect(projectId, "error"));
  }

  try {
    await createUploadedSource(
      projectId,
      file,
      String(formData.get("title") ?? "")
    );
  } catch {
    redirect(sourceRedirect(projectId, "error"));
  }

  redirect(sourceRedirect(projectId, "success"));
}
