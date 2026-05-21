import type { Block } from '@framework/types'
import { HeroBlockView } from './blocks/HeroBlockView'
import { SectionBlockView } from './blocks/SectionBlockView'
import { TextBlockView } from './blocks/TextBlockView'
import { HeadingBlockView } from './blocks/HeadingBlockView'
import { DividerBlockView } from './blocks/DividerBlockView'
import { SpacerBlockView } from './blocks/SpacerBlockView'
import { CalloutBlockView } from './blocks/CalloutBlockView'
import { RelatedLinksBlockView } from './blocks/RelatedLinksBlockView'
import { TableBlockView } from './blocks/TableBlockView'
import { PaletteBlockView } from './blocks/PaletteBlockView'
import { ColorCardBlockView } from './blocks/ColorCardBlockView'
import { ColorPairingBlockView } from './blocks/ColorPairingBlockView'
import { TintScaleBlockView } from './blocks/TintScaleBlockView'
import { LogoSpecimenBlockView } from './blocks/LogoSpecimenBlockView'
import { LogoGridBlockView } from './blocks/LogoGridBlockView'
import { LogoClearspaceBlockView } from './blocks/LogoClearspaceBlockView'
import { LogoMisuseBlockView } from './blocks/LogoMisuseBlockView'
import { LogoPlacementBlockView } from './blocks/LogoPlacementBlockView'
import { TypeSpecimenBlockView } from './blocks/TypeSpecimenBlockView'
import { TypeScaleBlockView } from './blocks/TypeScaleBlockView'
import { CharacterSetBlockView } from './blocks/CharacterSetBlockView'
import { ImageBlockView } from './blocks/ImageBlockView'
import { ImageGridBlockView } from './blocks/ImageGridBlockView'
import { DoDontGridBlockView } from './blocks/DoDontGridBlockView'
import { ToneChipsBlockView } from './blocks/ToneChipsBlockView'
import { VocabularyBlockView } from './blocks/VocabularyBlockView'
import { CopyExamplesBlockView } from './blocks/CopyExamplesBlockView'
import { PatternGridBlockView } from './blocks/PatternGridBlockView'
import { DownloadsBlockView } from './blocks/DownloadsBlockView'
import { MediaLibraryBlockView } from './blocks/MediaLibraryBlockView'
import { EmbedBlockView } from './blocks/EmbedBlockView'

/**
 * Dispatches to the correct block view component by `block.kind`. Each
 * view is responsible for its own layout / styling. Auto blocks pull
 * data from BrandBookContext; local blocks render their own props.
 */
export function BlockRenderer({ block }: { block: Block }) {
  switch (block.kind) {
    case 'hero':
      return <HeroBlockView block={block} />
    case 'section':
      return <SectionBlockView block={block} />
    case 'text':
      return <TextBlockView block={block} />
    case 'heading':
      return <HeadingBlockView block={block} />
    case 'divider':
      return <DividerBlockView block={block} />
    case 'spacer':
      return <SpacerBlockView block={block} />
    case 'callout':
      return <CalloutBlockView block={block} />
    case 'related':
      return <RelatedLinksBlockView block={block} />
    case 'table':
      return <TableBlockView block={block} />
    case 'palette':
      return <PaletteBlockView block={block} />
    case 'colorCard':
      return <ColorCardBlockView block={block} />
    case 'colorPairing':
      return <ColorPairingBlockView block={block} />
    case 'tintScale':
      return <TintScaleBlockView block={block} />
    case 'logoSpecimen':
      return <LogoSpecimenBlockView block={block} />
    case 'logoGrid':
      return <LogoGridBlockView block={block} />
    case 'logoClearspace':
      return <LogoClearspaceBlockView block={block} />
    case 'logoMisuse':
      return <LogoMisuseBlockView block={block} />
    case 'logoPlacement':
      return <LogoPlacementBlockView block={block} />
    case 'typeSpecimen':
      return <TypeSpecimenBlockView block={block} />
    case 'typeScale':
      return <TypeScaleBlockView block={block} />
    case 'characterSet':
      return <CharacterSetBlockView block={block} />
    case 'image':
      return <ImageBlockView block={block} />
    case 'imageGrid':
      return <ImageGridBlockView block={block} />
    case 'doDontGrid':
      return <DoDontGridBlockView block={block} />
    case 'toneChips':
      return <ToneChipsBlockView block={block} />
    case 'vocabulary':
      return <VocabularyBlockView block={block} />
    case 'copyExamples':
      return <CopyExamplesBlockView block={block} />
    case 'patternGrid':
      return <PatternGridBlockView block={block} />
    case 'downloads':
      return <DownloadsBlockView block={block} />
    case 'mediaLibrary':
      return <MediaLibraryBlockView block={block} />
    case 'embed':
      return <EmbedBlockView block={block} />
    default: {
      // Exhaustive check — TS will complain if a new BlockKind is added
      // and not handled here.
      const _: never = block
      void _
      return (
        <div className="fw-bbook__block-unknown">
          Unknown block kind: {(block as { kind: string }).kind}
        </div>
      )
    }
  }
}
