import { DomainContext } from './domain.context';
import { RawEntity, ViewModel } from './domain.types';

export interface DomainPipeline<Source, Raw extends RawEntity, VM extends ViewModel> {
    /**
     * Transport/Storage row -> Canonical Raw shape
     * PURE: No interpretation, just extraction.
     */
    adapt(source: Source): Raw;

    /**
     * Canonical Raw shape -> View Model
     * SEMANTIC AUTHORITY: All business rules, flags, and meaning assigned here.
     */
    map(raw: Raw, ctx: DomainContext): VM;
}

export function createDomainPipeline<Source, Raw extends RawEntity, VM extends ViewModel>(
    pipeline: DomainPipeline<Source, Raw, VM>
): DomainPipeline<Source, Raw, VM> {
    return pipeline;
}
