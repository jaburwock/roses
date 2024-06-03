#!/usr/bin/env bash

transcriptgff="$1"
genename="$2"

zcat "$transcriptgff" | \
    awk -v genename="$genename" 'BEGIN {FS="\t"; OFS="\t"} $3 == "exon" && $9 ~ "gene=" genename ";" {print $0}'
