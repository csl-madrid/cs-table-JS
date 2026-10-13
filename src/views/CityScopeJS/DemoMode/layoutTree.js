// The layout of the demo view as a tree of splits, like the panes of an editor.
// Pure maths, no React or Redux, so every part of the app can share it.
//
//   leaf:  { id }                              a box
//   split: { id, dir, ratio, a, b }            two children side by side
//                                              (dir "col") or one over the
//                                              other (dir "row"); `ratio` is
//                                              the share of the first one
//
// A tree like this always tiles the screen: boxes never overlap or leave holes.

export const isSplit = (node) => node.dir !== undefined;

export const leafIds = (node) =>
  isSplit(node) ? [...leafIds(node.a), ...leafIds(node.b)] : [node.id];

// Builders to describe a layout without ids (ids are given by assignIds)
export const leaf = () => ({});
export const col = (ratio, a, b) => ({ dir: "col", ratio, a, b });
export const row = (ratio, a, b) => ({ dir: "row", ratio, a, b });

/** Gives every node an id ("b<n>" boxes, "s<n>" splits), counting from `from` */
export const assignIds = (node, from = 1) => {
  let next = from;
  const walk = (n) => {
    if (isSplit(n)) {
      const id = `s${next++}`;
      return { id, dir: n.dir, ratio: n.ratio, a: walk(n.a), b: walk(n.b) };
    }
    return { id: `b${next++}` };
  };
  const tree = walk(node);
  return { tree, nextId: next };
};

/**
 * Where everything goes, in px from the window's top-left corner:
 * - boxes: { [leafId]: { left, top, width, height } }
 * - dividers: one per split, the strip of `gap` px between its two children
 *   (`rect`) plus the area the split covers (`node`), which is what dragging
 *   the divider has to be measured against
 */
export const computeLayout = (tree, width, height, gap) => {
  const boxes = {};
  const dividers = [];

  const place = (node, rect) => {
    if (!isSplit(node)) {
      boxes[node.id] = rect;
      return;
    }
    if (node.dir === "col") {
      const first = (rect.width - gap) * node.ratio;
      place(node.a, { ...rect, width: first });
      place(node.b, {
        ...rect,
        left: rect.left + first + gap,
        width: rect.width - gap - first,
      });
      dividers.push({
        id: node.id,
        dir: "col",
        rect: { ...rect, left: rect.left + first, width: gap },
        node: rect,
      });
    } else {
      const first = (rect.height - gap) * node.ratio;
      place(node.a, { ...rect, height: first });
      place(node.b, {
        ...rect,
        top: rect.top + first + gap,
        height: rect.height - gap - first,
      });
      dividers.push({
        id: node.id,
        dir: "row",
        rect: { ...rect, top: rect.top + first, height: gap },
        node: rect,
      });
    }
  };

  // padding on all sides, as between the boxes
  place(tree, {
    left: gap,
    top: gap,
    width: width - 2 * gap,
    height: height - 2 * gap,
  });
  return { boxes, dividers };
};

/** What the tree is made of, ignoring the ratios: changes when boxes do */
export const structureKey = (node) =>
  isSplit(node)
    ? `(${node.dir}${structureKey(node.a)}${structureKey(node.b)})`
    : node.id;

// The edits below return a new tree and leave the one they are given as is

export const setRatio = (node, splitId, ratio) => {
  if (!isSplit(node)) return node;
  if (node.id === splitId) return { ...node, ratio };
  return {
    ...node,
    a: setRatio(node.a, splitId, ratio),
    b: setRatio(node.b, splitId, ratio),
  };
};

/** Replaces box `leafId` with a split of itself and a new box `newLeafId` */
export const splitLeaf = (node, leafId, dir, newSplitId, newLeafId) => {
  if (isSplit(node)) {
    return {
      ...node,
      a: splitLeaf(node.a, leafId, dir, newSplitId, newLeafId),
      b: splitLeaf(node.b, leafId, dir, newSplitId, newLeafId),
    };
  }
  if (node.id !== leafId) return node;
  return { id: newSplitId, dir, ratio: 0.5, a: node, b: { id: newLeafId } };
};

/** Removes box `leafId`: its sibling takes the room of their split */
export const removeLeaf = (node, leafId) => {
  if (!isSplit(node)) return node;
  if (!isSplit(node.a) && node.a.id === leafId) return node.b;
  if (!isSplit(node.b) && node.b.id === leafId) return node.a;
  return {
    ...node,
    a: removeLeaf(node.a, leafId),
    b: removeLeaf(node.b, leafId),
  };
};
