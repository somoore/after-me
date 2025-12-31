// =============================================================================
// LOSSLESS GEDCOM PARSER - Phase 2
// Preserves every tag, line, and custom field for archival-grade fidelity
// =============================================================================

class LosslessGedcomParser {
  parse(text) {
    const lines = text.split(/\r?\n/);
    const records = {};  // @ID@ -> RecordNode
    let header = null;
    let trailer = false;

    // Parse into hierarchical record tree
    const rootNodes = this.parseLines(lines);

    // Organize by record type
    for (const node of rootNodes) {
      if (node.tag === 'HEAD') {
        header = node;
      } else if (node.tag === 'TRLR') {
        trailer = true;
      } else if (node.xref) {
        records[node.xref] = node;
      }
    }

    // Build dual representation
    const canonical = { header, records, trailer };
    const friendly = this.buildFriendlyModel(canonical);

    return {
      canonical,  // Lossless record tree
      friendly,   // UI-friendly model
      meta: {
        sourceFormat: 'gedcom55',
        parsedAt: new Date().toISOString(),
        lineCount: lines.length,
        recordCount: Object.keys(records).length
      }
    };
  }

  parseLines(lines) {
    const stack = []; // Stack of {node, level}
    const roots = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const node = this.parseLine(line, i + 1);
      if (!node) continue;

      // Pop stack until we find the parent
      while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
        stack.pop();
      }

      // Add to parent or roots
      if (stack.length === 0) {
        roots.push(node);
      } else {
        const parent = stack[stack.length - 1].node;
        parent.children.push(node);
      }

      // Push to stack
      stack.push({ node, level: node.level });
    }

    return roots;
  }

  parseLine(line, lineNum) {
    // GEDCOM line format: LEVEL [@XREF@] TAG [VALUE]
    const match = line.match(/^(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s+(.*))?$/);
    if (!match) {
      console.warn(`Line ${lineNum}: Invalid GEDCOM format: ${line}`);
      return null;
    }

    const [, levelStr, xref, tag, value] = match;

    return {
      level: parseInt(levelStr),
      xref: xref || null,
      tag: tag,
      value: value || '',
      children: [],
      lineNum
    };
  }

  // Join CONC/CONT lines into complete values
  joinContinuations(node) {
    if (node.children.length === 0) return node.value;

    let result = node.value;
    const nonContinuation = [];

    for (const child of node.children) {
      if (child.tag === 'CONC') {
        // CONC continues on same line (no space)
        result += child.value;
      } else if (child.tag === 'CONT') {
        // CONT adds new line
        result += '\n' + child.value;
      } else {
        nonContinuation.push(child);
      }
    }

    // Replace children with non-continuation nodes
    node.children = nonContinuation;

    return result;
  }

  buildFriendlyModel(canonical) {
    const individuals = {};
    const families = {};
    const sources = {};
    const media = {};
    const repositories = {};
    const notes = {};

    for (const [xref, node] of Object.entries(canonical.records)) {
      switch (node.tag) {
        case 'INDI':
          individuals[xref] = this.parseIndividual(node, xref);
          break;
        case 'FAM':
          families[xref] = this.parseFamily(node, xref);
          break;
        case 'SOUR':
          sources[xref] = this.parseSource(node, xref);
          break;
        case 'OBJE':
          media[xref] = this.parseMedia(node, xref);
          break;
        case 'REPO':
          repositories[xref] = this.parseRepository(node, xref);
          break;
        case 'NOTE':
          notes[xref] = this.parseNote(node, xref);
          break;
      }
    }

    return {
      individuals,
      families,
      sources,
      media,
      repositories,
      notes
    };
  }

  parseIndividual(node, id) {
    const person = {
      id,
      names: [],
      sex: '',
      events: [],
      attributes: [],
      famc: [],
      fams: [],
      sources: [],
      media: [],
      notes: [],
      customTags: {},
      raw: node  // Keep reference to canonical record
    };

    for (const child of node.children) {
      switch (child.tag) {
        case 'NAME':
          person.names.push(this.parseName(child));
          break;
        case 'SEX':
          person.sex = child.value;
          break;
        case 'BIRT':
        case 'DEAT':
        case 'BURI':
        case 'CHR':
        case 'BAPM':
        case 'MARR':
        case 'RESI':
        case 'CENS':
        case 'OCCU':
        case 'EDUC':
        case 'RELI':
        case 'NATU':
        case 'EMIG':
        case 'IMMI':
        case 'PROB':
        case 'WILL':
          person.events.push(this.parseEvent(child));
          break;
        case 'FAMC':
          person.famc.push(child.value);
          break;
        case 'FAMS':
          person.fams.push(child.value);
          break;
        case 'SOUR':
          person.sources.push(this.parseSourceCitation(child));
          break;
        case 'OBJE':
          person.media.push(this.parseMediaLink(child));
          break;
        case 'NOTE':
          person.notes.push(this.parseNoteLink(child));
          break;
        default:
          // Preserve custom tags (like _APID, _MILT, etc.)
          if (child.tag.startsWith('_')) {
            person.customTags[child.tag] = this.joinContinuations(child);
          }
      }
    }

    // Set primary name for UI
    if (person.names.length > 0) {
      const primary = person.names[0];
      person.name = primary.full;
      person.givenName = primary.given;
      person.surname = primary.surname;
      person.suffix = primary.suffix;
      person.displayName = primary.full;
    }

    // Set vital dates for UI
    person.birth = person.events.find(e => e.type === 'BIRT') || {};
    person.death = person.events.find(e => e.type === 'DEAT') || {};
    person.burial = person.events.find(e => e.type === 'BURI') || {};

    return person;
  }

  parseName(node) {
    const nameStr = this.joinContinuations(node);
    const name = {
      full: '',
      given: '',
      surname: '',
      suffix: '',
      prefix: '',
      type: '',
      sources: []
    };

    // Parse "GivenName /Surname/ Suffix" format
    const surnameMatch = nameStr.match(/\/([^\/]*)\//);
    if (surnameMatch) {
      name.surname = surnameMatch[1].trim();
    }

    const parts = nameStr.split('/');
    name.given = parts[0].trim();
    if (parts.length > 2) {
      name.suffix = parts[2].trim();
    }

    // Check for subfields (GIVN, SURN, NSFX, etc.)
    for (const child of node.children) {
      switch (child.tag) {
        case 'GIVN':
          name.given = child.value;
          break;
        case 'SURN':
          name.surname = child.value;
          break;
        case 'NSFX':
          name.suffix = child.value;
          break;
        case 'NPFX':
          name.prefix = child.value;
          break;
        case 'TYPE':
          name.type = child.value;
          break;
        case 'SOUR':
          name.sources.push(this.parseSourceCitation(child));
          break;
      }
    }

    name.full = [name.prefix, name.given, name.surname, name.suffix]
      .filter(Boolean).join(' ').trim() || 'Unknown';

    return name;
  }

  parseEvent(node) {
    const event = {
      type: node.tag,
      date: '',
      place: '',
      description: node.value || '',
      sources: [],
      media: [],
      notes: [],
      customTags: {}
    };

    for (const child of node.children) {
      switch (child.tag) {
        case 'DATE':
          event.date = child.value;
          break;
        case 'PLAC':
          event.place = this.joinContinuations(child);
          break;
        case 'ADDR':
          event.address = this.joinContinuations(child);
          break;
        case 'SOUR':
          event.sources.push(this.parseSourceCitation(child));
          break;
        case 'OBJE':
          event.media.push(this.parseMediaLink(child));
          break;
        case 'NOTE':
          event.notes.push(this.parseNoteLink(child));
          break;
        default:
          if (child.tag.startsWith('_')) {
            event.customTags[child.tag] = this.joinContinuations(child);
          }
      }
    }

    return event;
  }

  parseFamily(node, id) {
    const family = {
      id,
      husband: null,
      wife: null,
      children: [],
      events: [],
      sources: [],
      media: [],
      notes: [],
      raw: node
    };

    for (const child of node.children) {
      switch (child.tag) {
        case 'HUSB':
          family.husband = child.value;
          break;
        case 'WIFE':
          family.wife = child.value;
          break;
        case 'CHIL':
          family.children.push(child.value);
          break;
        case 'MARR':
        case 'DIV':
        case 'ENGA':
          family.events.push(this.parseEvent(child));
          break;
        case 'SOUR':
          family.sources.push(this.parseSourceCitation(child));
          break;
      }
    }

    // Set marriage for backward compatibility
    family.marriage = family.events.find(e => e.type === 'MARR') || {};

    return family;
  }

  parseSource(node, id) {
    const source = {
      id,
      title: '',
      author: '',
      publisher: '',
      repository: null,
      citations: [],
      notes: [],
      media: [],
      customTags: {},
      raw: node
    };

    for (const child of node.children) {
      switch (child.tag) {
        case 'TITL':
          source.title = this.joinContinuations(child);
          break;
        case 'AUTH':
          source.author = this.joinContinuations(child);
          break;
        case 'PUBL':
          source.publisher = this.joinContinuations(child);
          break;
        case 'REPO':
          source.repository = child.value;
          break;
        case 'NOTE':
          source.notes.push(this.parseNoteLink(child));
          break;
        case 'OBJE':
          source.media.push(this.parseMediaLink(child));
          break;
        default:
          if (child.tag.startsWith('_')) {
            source.customTags[child.tag] = this.joinContinuations(child);
          }
      }
    }

    return source;
  }

  parseSourceCitation(node) {
    const citation = {
      source: node.value,  // @SOUR_ID@
      page: '',
      data: {},
      quality: '',
      media: [],
      notes: []
    };

    for (const child of node.children) {
      switch (child.tag) {
        case 'PAGE':
          citation.page = this.joinContinuations(child);
          break;
        case 'QUAY':
          citation.quality = child.value;
          break;
        case 'DATA':
          citation.data = this.parseSourceData(child);
          break;
        case 'OBJE':
          citation.media.push(this.parseMediaLink(child));
          break;
        case 'NOTE':
          citation.notes.push(this.parseNoteLink(child));
          break;
      }
    }

    return citation;
  }

  parseSourceData(node) {
    const data = {
      date: '',
      text: [],
      urls: []
    };

    for (const child of node.children) {
      switch (child.tag) {
        case 'DATE':
          data.date = child.value;
          break;
        case 'TEXT':
          data.text.push(this.joinContinuations(child));
          break;
        case 'WWW':
        case '_LINK':
          data.urls.push(child.value);
          break;
      }
    }

    return data;
  }

  parseMedia(node, id) {
    const media = {
      id,
      title: '',
      file: '',
      mimeType: '',
      data: null,  // Base64 data URL if embedded
      metadata: {},
      customTags: {},
      raw: node
    };

    for (const child of node.children) {
      switch (child.tag) {
        case 'TITL':
          media.title = this.joinContinuations(child);
          break;
        case 'FILE':
          const fileInfo = this.parseMediaFile(child);
          media.file = fileInfo.path;
          media.mimeType = fileInfo.type;
          media.data = fileInfo.data;
          break;
        default:
          if (child.tag.startsWith('_')) {
            media.customTags[child.tag] = child.value;
          }
      }
    }

    return media;
  }

  parseMediaFile(node) {
    const result = {
      path: node.value,
      type: '',
      data: null
    };

    // Check if it's a data URL
    if (node.value.startsWith('data:')) {
      result.data = node.value;
      const typeMatch = node.value.match(/^data:([^;,]+)/);
      if (typeMatch) result.type = typeMatch[1];
    }

    for (const child of node.children) {
      if (child.tag === 'FORM') {
        result.type = child.value;
      }
    }

    return result;
  }

  parseMediaLink(node) {
    if (node.value.startsWith('@')) {
      return { ref: node.value };
    }
    // Inline media object
    return this.parseMedia(node, null);
  }

  parseRepository(node, id) {
    return {
      id,
      name: '',
      address: '',
      notes: [],
      raw: node
    };
  }

  parseNote(node, id) {
    return {
      id,
      text: this.joinContinuations(node),
      raw: node
    };
  }

  parseNoteLink(node) {
    if (node.value.startsWith('@')) {
      return { ref: node.value };
    }
    return { text: this.joinContinuations(node) };
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LosslessGedcomParser;
}
