import { getProjects } from "../_lib/data-service";
import ProjectsList from "./ProjectsList";

export default async function Projects() {
  const projects = await getProjects();

  return <ProjectsList projects={projects ?? []} />;
}
