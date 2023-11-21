/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as React from "react"

import {
  CustomCell,
  CustomRenderer,
  getMiddleCenterBias,
  measureTextCached,
  blend,
  GridCellKind,
} from "@glideapps/glide-data-grid"
import UriOverlayEditor from "./UriOverlayEditor"

const UNDERLINE_OFFSET = 5

export interface LinkCellProps {
  readonly kind: "link-cell"
  readonly href: string
  readonly displayText?: string
}

export type LinkCell = CustomCell<LinkCellProps>

function onClickSelect(
  e: Parameters<NonNullable<CustomRenderer<LinkCell>["onSelect"]>>[0]
): string | undefined {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d", { alpha: false })
  if (ctx === null) return

  const { posX: hoverX, bounds: rect, cell, theme } = e
  const font = `${theme.baseFontStyle} ${theme.fontFamily}`
  ctx.font = font

  const { href, displayText } = cell.data

  const rectHoverX = rect.x + hoverX

  const textWidth =
    ctx.measureText(getLinkDisplayValue(href, displayText)).width +
    theme.cellHorizontalPadding * 2

  const isHovered = rectHoverX > rect.x && rectHoverX < rect.x + textWidth

  if (isHovered) {
    return href
  }

  return undefined
}

export function getLinkDisplayValue(
  href: string,
  displayText?: string
): string {
  if (!displayText) {
    return href
  }

  try {
    // assume displayText is a regex first and attempt to find a pattern match in the url
    // u flag allows unicode characters
    // s flag allows . to match newlines
    const displayTextRegex = new RegExp(displayText, "us")

    // apply the regex pattern to display the value
    const patternMatch = href.match(displayTextRegex)
    if (patternMatch) {
      // return the first matching group
      return patternMatch[1]
    }

    // if the regex doesn't find a match with the url (or it wasn't a regex pattern at all), return the displayText value
    return displayText
  } catch (error) {
    // if there was any error return displayText
    return displayText
  }
}

export const linkCellRenderer: CustomRenderer<LinkCell> = {
  draw: (args, cell) => {
    const { ctx, rect, theme, hoverX = -100, highlighted } = args
    const { href, displayText } = cell.data
    if (href === undefined) return

    const displayValue = getLinkDisplayValue(href, displayText)

    const xPad = theme.cellHorizontalPadding

    const drawX = rect.x + xPad

    const rectHoverX = rect.x + hoverX

    const font = `${theme.baseFontStyle} ${theme.fontFamily}`
    ctx.font = font
    const middleCenterBias = getMiddleCenterBias(ctx, font)
    const drawY = rect.y + rect.height / 2 + middleCenterBias

    const isHovered = rectHoverX > rect.x && rectHoverX < rect.x + rect.width

    if (isHovered) {
      // draw the underline only when the cell is hovered
      const metrics = measureTextCached(displayValue, ctx, font)

      ctx.moveTo(drawX, Math.floor(drawY + UNDERLINE_OFFSET) + 0.5)
      ctx.lineTo(
        drawX + metrics.width,
        Math.floor(drawY + UNDERLINE_OFFSET) + 0.5
      )

      ctx.strokeStyle = theme.linkColor
      ctx.stroke()

      ctx.fillStyle = highlighted
        ? blend(theme.accentLight, theme.bgCell)
        : theme.bgCell
      ctx.fillText(displayValue, drawX - 1, drawY)
      ctx.fillText(displayValue, drawX + 1, drawY)

      ctx.fillText(displayValue, drawX - 2, drawY)
      ctx.fillText(displayValue, drawX + 2, drawY)
    }

    ctx.fillStyle = theme.linkColor
    ctx.fillText(displayValue, drawX, drawY)
    ctx.closePath()

    return true
  },
  isMatch: (c): c is LinkCell =>
    (c.data as LinkCellProps).kind === "link-cell",
  kind: GridCellKind.Custom,
  measure: (ctx, cell, theme) => {
    const { href, displayText } = cell.data
    if (href === undefined) return 0

    return (
      ctx.measureText(getLinkDisplayValue(href, displayText)).width +
      theme.cellHorizontalPadding * 2
    )
  },
  needsHover: true,
  needsHoverPosition: true,
  onSelect: e => {
    const redirectLink = onClickSelect(e)

    if (redirectLink !== undefined) {
      window.open(redirectLink, "_blank")
    }
  },
  onDelete: c => ({
    ...c,
    data: {
      ...c.data,
      displayText: "",
      href: "",
    },
  }),
  provideEditor: () => p => {
    const { onChange, value, forceEditMode, validatedSelection } = p
    const { href, displayText } = value.data
    return (
      <UriOverlayEditor
        forceEditMode={forceEditMode}
        uri={value.data.href}
        preview={getLinkDisplayValue(href, displayText)}
        validatedSelection={validatedSelection}
        readonly={value.readonly === true}
        onChange={e =>
          onChange({
            ...value,
            copyData: e.target.value,
            data: {
              ...value.data,
              href: e.target.value,
              displayText: value.data.displayText,
            },
          })
        }
      />
    )
  },
  onPaste: (toPaste, cellData) => {
    return toPaste === cellData.href
      ? undefined
      : { ...cellData, href: toPaste }
  },
}
