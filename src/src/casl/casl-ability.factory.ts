import { Injectable } from '@nestjs/common';
import {
	AbilityBuilder,
	ExtractSubjectType,
	InferSubjects,
	MongoAbility,
	createMongoAbility,
} from '@casl/ability';

import User from './models/user.model';
import ProgramFacilitator from './models/programFacilitator.model';
import ProgramBeneficiary from './models/programBeneficiary.model';
import Action from './enums/actions';
import Role from './enums/roles';

type Subjects = InferSubjects<typeof User | typeof ProgramBeneficiary> | 'all';

export type AppAbility = MongoAbility<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {

	createForUser(user: User) {
		const { can, cannot, build } = new AbilityBuilder<AppAbility>(
			createMongoAbility,
		);

		return build({
		  // Read https://casl.js.org/v5/en/guide/subject-type-detection#use-classes-as-subject-types for details
		  detectSubjectType: (item) =>
		    item.constructor as ExtractSubjectType<Subjects>,
		});
	}

	createForFacilitator(user: User) {
		const { can, cannot, build } = new AbilityBuilder<AppAbility>(
			createMongoAbility,
		);

		can(Action.ReadOne, ProgramBeneficiary, { facilitator_id: user.id });
		can(Action.ReadAll, ProgramBeneficiary);

		return build({
		  // Read https://casl.js.org/v5/en/guide/subject-type-detection#use-classes-as-subject-types for details
		  detectSubjectType: (item) =>
		    item.constructor as ExtractSubjectType<Subjects>,
		});
	}

	createForImplementationPartner(user: User) {
		const { can, cannot, build } = new AbilityBuilder<AppAbility>(
			createMongoAbility,
		);

		can(Action.ReadAll, ProgramBeneficiary);

		return build({
		  // Read https://casl.js.org/v5/en/guide/subject-type-detection#use-classes-as-subject-types for details
		  detectSubjectType: (item) =>
		    item.constructor as ExtractSubjectType<Subjects>,
		});
	}

	createForProgramOwner(user: User) {
		const { can, cannot, build } = new AbilityBuilder<AppAbility>(
			createMongoAbility,
		);

		can(Action.ReadAll, ProgramBeneficiary);

		return build({
		  // Read https://casl.js.org/v5/en/guide/subject-type-detection#use-classes-as-subject-types for details
		  detectSubjectType: (item) =>
		    item.constructor as ExtractSubjectType<Subjects>,
		});
	}
}
