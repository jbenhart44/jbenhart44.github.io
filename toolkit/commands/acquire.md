# /acquire — Get the Source on File

You are about to cite a paper that is not on your disk, and the link or DOI came from a language model.

## When You Need This

- A document cites a paper you do not have as a file yet
- You have a list of papers to fetch and check in one go
- A DOI came from a language model or a search snippet, and you need to know it points at the right paper

## What It Does — And What It Won't

`/acquire` downloads a paper, or every paper in a manifest table. It checks that the file is the right document, extracts its text beside the PDF, and grep-checks each figure you claimed against that text. It refuses an HTML page that stands in for a PDF. It checks a DOI against CrossRef and stops if the claimed first author is not on the record. It never overwrites an existing file. When a scanned PDF yields too little text, it writes no `.txt` and transcribes the pages with page readers, then checks the transcription before it installs anything. It ends every run with a VERDICT line.

It does not cite anything for you. A figure counts only when it is FOUND in the text on disk, and a figure on an unreadable page is reported as such. It cannot beat a host that blocks automated requests: it lists known blocked sources, such as SSRN and ScienceDirect, and the fallback steps to try. A library proxy needs your own login, which the assistant does not have. It needs `pypdf` or `PyMuPDF` for extraction.

`/acquire` is in the full install. It is not in the `--minimal` install. Use `/readable` for files you already have on disk, and `/audit` afterwards to check a document against the extracted text.

## Worked Example

Ravi cites a response rate of 22% in his methods section. He does not have the paper yet.

```
/acquire https://example.org/paper.pdf "papers/Author_2024.pdf" claimed:"22%"
```

`/acquire` downloads the file and confirms it is a PDF. It extracts the text to `papers/Author_2024.txt` and searches that text for "22%". It then prints a row for the paper with the download status, the extraction status and the grep result. If the figure is on page 14, the row reads FOUND "22%" p.14, with the line around it. The run ends with a line such as `VERDICT: 1/1 acquired | 0 SPARSE/EMPTY (need transcription) | 0 grep NOT-FOUND | 0 blocked`. If the figure were missing, the row would say NOT FOUND and the verdict would name it as a possible error to log before Ravi cites it.

## Try It

```
/acquire <url> <target_path> [claimed:"<string>" ...]
/acquire https://example.org/paper.pdf "papers/Author_2024.pdf" claimed:"22%"
/acquire manifest:papers/to_acquire.md
```
