#!/usr/bin/env bash

transcriptgff="$1"
genename="$2"

# Extract exon intervals from gff file and convert to bed format
zcat "$transcriptgff" | \
    awk -v genename="$genename" \
    'BEGIN {FS="\t"; OFS="\t"} $3 == "exon" && $9 ~ "gene=" genename ";" {print $1, $4-1, $5, genename, ".", $7}'
